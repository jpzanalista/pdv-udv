/**
 * Importa o histórico de vendas 2026 do TaurusPOS (relatorio_vendas_2026.md) para o PDV.
 *
 * - Vendas + itens (data 00:00 local), marcadas como HISTÓRICO (terminal sintético, retroativa).
 * - NÃO cria dívida no crediário (tudo já foi pago por boleto) → sem lançamento.
 * - Forma de pagamento: sócio = "na conta"; avulso ("CONSUMIDOR NÃO IDENTIFICADO") = presencial
 *   (Pix/Dinheiro/Crédito/Débito) distribuído pela proporção real do faturamento_diario_2026.
 * - Idempotente: re-rodar apaga e reinsere o histórico (não duplica).
 *
 * Rodar:  pnpm --filter @pdv-udv/db db:import-vendas
 * Lê o .md de TAURUS_VENDAS_MD ou de ../data/taurus/relatorio_vendas_2026.md
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { and, eq, inArray } from 'drizzle-orm'
import { createAdminDb } from './client.js'
import { contas, nucleos, pagamentos, produtos, terminais, vendaItens, vendas } from './schema.js'

const url = process.env.DATABASE_URL ?? 'postgresql://pdv:pdv@localhost:5440/pdv'
const NUCLEO_UDV_ID = 162
const MD_PATH =
  process.env.TAURUS_VENDAS_MD ?? new URL('../data/taurus/relatorio_vendas_2026.md', import.meta.url)
const AVULSO = 'consumidor nao identificado'

// Proporção presencial (faturamento_diario_2026): Pix 63,6% · Dinheiro 15,5% · Crédito 14,6% · Débito 6,4%.
const PRESENCIAL = [
  { metodo: 'pix' as const, peso: 393960 },
  { metodo: 'dinheiro' as const, peso: 95850 },
  { metodo: 'cartao_credito' as const, peso: 90500 },
  { metodo: 'cartao_debito' as const, peso: 39600 },
]
const PESO_TOTAL = PRESENCIAL.reduce((s, p) => s + p.peso, 0)

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const reais = (c: number) => (c / 100).toFixed(2)
function brCents(s: string): number {
  const n = Number.parseFloat(
    s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'),
  )
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** Instante UTC de 00:00 local (no fuso do núcleo). Brasil sem DST → exato. */
function meiaNoiteLocal(ano: number, mes1: number, dia: number, tz: string): Date {
  const guess = Date.UTC(ano, mes1 - 1, dia, 0, 0, 0)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const x of dtf.formatToParts(new Date(guess))) p[x.type] = x.value
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return new Date(guess - (asUTC - guess))
}

type Item = { desc: string; qtde: number; unit: number; total: number }
type Venda = {
  ref: string
  data: Date
  cliente: string
  cancelada: boolean
  totalCents: number
  itens: Item[]
}

function parse(md: string): Venda[] {
  const blocks = md.split(/\n### Venda /).slice(1)
  const out: Venda[] = []
  for (const b of blocks) {
    const head = b.split('\n', 1)[0]
    const mh = head.match(/^(\S+)\s+—\s+(\d{2})\/(\d{2})\/(\d{4})/)
    if (!mh) continue
    const [, ref, dd, mm, yyyy] = mh
    const cliente = (b.match(/\*\*Cliente:\*\*\s*(.+)/)?.[1] ?? '').trim()
    const situ = b.match(/\*\*Situação:\*\*\s*(\S+)/)?.[1] ?? 'Autorizada'
    const totalCents = brCents(b.match(/\*\*Valor:\*\*\s*([^\n]+)/)?.[1] ?? '0')
    const itens: Item[] = []
    for (const ln of b.split('\n')) {
      if (!ln.startsWith('|')) continue
      const c = ln.split('|').map((x) => x.trim())
      if (c.length < 5) continue
      const desc = c[1]
      if (!desc || desc === 'Produto' || desc.startsWith('---')) continue
      const qtde = Number.parseFloat(c[2].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
      itens.push({ desc, qtde, unit: brCents(c[3]), total: brCents(c[4]) })
    }
    if (!cliente || itens.length === 0) continue
    out.push({
      ref,
      data: new Date(+yyyy, +mm - 1, +dd), // placeholder; tz aplicado depois
      cliente,
      cancelada: /cancel/i.test(situ),
      totalCents,
      itens,
    })
    // guarda y/m/d para recomputar com tz
    ;(out[out.length - 1] as Venda & { ymd: [number, number, number] }).ymd = [+yyyy, +mm, +dd]
  }
  return out
}

async function main() {
  const db = createAdminDb(url)
  const md = readFileSync(MD_PATH, 'utf8')

  const [nucleo] = await db.select().from(nucleos).where(eq(nucleos.udvId, NUCLEO_UDV_ID)).limit(1)
  if (!nucleo) throw new Error(`núcleo udv_id ${NUCLEO_UDV_ID} não encontrado (rode db:seed antes)`)
  const tz = nucleo.timezone ?? 'America/Sao_Paulo'

  // Terminal sintético "Histórico 2026" (idempotente por nome).
  const nomeTerminal = 'Histórico 2026'
  let [term] = await db
    .select()
    .from(terminais)
    .where(and(eq(terminais.nucleoId, nucleo.id), eq(terminais.nome, nomeTerminal)))
    .limit(1)
  if (!term) {
    ;[term] = await db
      .insert(terminais)
      .values({ nucleoId: nucleo.id, nome: nomeTerminal, tipo: 'desktop' })
      .returning()
  }

  // Idempotência: limpa histórico anterior (pagamentos, itens, vendas desse terminal).
  const antigas = await db.select({ id: vendas.id }).from(vendas).where(eq(vendas.terminalId, term.id))
  if (antigas.length) {
    const ids = antigas.map((v) => v.id)
    await db.delete(pagamentos).where(inArray(pagamentos.vendaId, ids))
    await db.delete(vendaItens).where(inArray(vendaItens.vendaId, ids))
    await db.delete(vendas).where(eq(vendas.terminalId, term.id))
  }

  // Mapas existentes.
  const contasRows = await db
    .select({ id: contas.id, nome: contas.nome, tipo: contas.tipo, codigo: contas.codigo })
    .from(contas)
    .where(eq(contas.nucleoId, nucleo.id))
  const contaByNome = new Map(contasRows.map((c) => [norm(c.nome), c]))
  let maxCodigo = contasRows.reduce((m, c) => Math.max(m, c.codigo ?? 0), 0)

  const prodRows = await db
    .select({ id: produtos.id, descricao: produtos.descricao })
    .from(produtos)
    .where(eq(produtos.nucleoId, nucleo.id))
  const prodByDesc = new Map(prodRows.map((p) => [norm(p.descricao), p.id]))

  const vds = parse(md)

  // 1) Cria produtos e contas que faltam.
  const novosProd = new Map<string, { descricao: string; unit: number }>()
  const novasContas = new Map<string, string>()
  for (const v of vds) {
    const ck = norm(v.cliente)
    if (ck !== AVULSO && !contaByNome.has(ck) && !novasContas.has(ck)) novasContas.set(ck, v.cliente)
    for (const it of v.itens) {
      const pk = norm(it.desc)
      if (!prodByDesc.has(pk) && !novosProd.has(pk)) novosProd.set(pk, { descricao: it.desc, unit: it.unit })
    }
  }
  if (novosProd.size) {
    const inserted = await db
      .insert(produtos)
      .values(
        [...novosProd.values()].map((p) => ({
          nucleoId: nucleo.id,
          descricao: p.descricao,
          precoVenda: reais(p.unit),
          precoCusto: reais(Math.round(p.unit * 0.6)), // custo = 60% (fallback)
          exibirVenda: false, // histórico — não polui a grade de venda
        })),
      )
      .returning({ id: produtos.id, descricao: produtos.descricao })
    for (const p of inserted) prodByDesc.set(norm(p.descricao), p.id)
  }
  if (novasContas.size) {
    const inserted = await db
      .insert(contas)
      .values(
        [...novasContas.values()].map((nome) => ({
          nucleoId: nucleo.id,
          tipo: 'socio' as const,
          nome,
          codigo: ++maxCodigo,
        })),
      )
      .returning({ id: contas.id, nome: contas.nome, tipo: contas.tipo, codigo: contas.codigo })
    for (const c of inserted) contaByNome.set(norm(c.nome), c)
  }

  // 2) Monta vendas, itens e pagamentos (avulso).
  const avulsoAssigned: Record<string, number> = { pix: 0, dinheiro: 0, cartao_credito: 0, cartao_debito: 0 }
  const vRows: (typeof vendas.$inferInsert)[] = []
  const iRows: (typeof vendaItens.$inferInsert)[] = []
  const pRows: (typeof pagamentos.$inferInsert)[] = []
  let numero = 0

  // ordena por data p/ distribuição determinística
  vds.sort((a, b) => {
    const A = (a as Venda & { ymd: number[] }).ymd
    const B = (b as Venda & { ymd: number[] }).ymd
    return A[0] - B[0] || A[1] - B[1] || A[2] - B[2] || a.ref.localeCompare(b.ref)
  })

  for (const v of vds) {
    const ymd = (v as Venda & { ymd: [number, number, number] }).ymd
    const occurredAt = meiaNoiteLocal(ymd[0], ymd[1], ymd[2], tz)
    const ck = norm(v.cliente)
    const conta = ck === AVULSO ? undefined : contaByNome.get(ck)
    const somaItens = v.itens.reduce((s, it) => s + it.total, 0)
    const totalCents = v.totalCents || somaItens
    const desconto = Math.max(0, somaItens - totalCents)
    const vendaId = randomUUID()

    vRows.push({
      id: vendaId,
      nucleoId: nucleo.id,
      terminalId: term.id,
      expedienteId: null,
      numero: ++numero,
      personKind: conta?.tipo === 'socio' || conta?.tipo === 'visitante' ? conta.tipo : null,
      contaId: conta?.id ?? null,
      total: reais(totalCents),
      desconto: reais(desconto),
      cancelada: v.cancelada,
      occurredAt,
      retroativa: true,
    })
    for (const it of v.itens) {
      iRows.push({
        id: randomUUID(),
        vendaId,
        produtoId: prodByDesc.get(norm(it.desc)) ?? null,
        descricao: it.desc,
        qtde: String(it.qtde),
        unitario: reais(it.unit),
        total: reais(it.total),
      })
    }
    // avulso → pagamento presencial distribuído pela proporção real
    if (!conta && !v.cancelada && totalCents > 0) {
      const total = Object.values(avulsoAssigned).reduce((a, b) => a + b, 0) + totalCents
      let best = PRESENCIAL[0]
      let bestDef = -Infinity
      for (const p of PRESENCIAL) {
        const def = (p.peso / PESO_TOTAL) * total - avulsoAssigned[p.metodo]
        if (def > bestDef) {
          bestDef = def
          best = p
        }
      }
      avulsoAssigned[best.metodo] += totalCents
      pRows.push({ vendaId, metodo: best.metodo, valor: reais(totalCents) })
    }
  }

  // 3) Insere em lotes.
  const chunk = <T>(arr: T[], n: number) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))
  for (const c of chunk(vRows, 400)) await db.insert(vendas).values(c)
  for (const c of chunk(iRows, 400)) await db.insert(vendaItens).values(c)
  for (const c of chunk(pRows, 400)) await db.insert(pagamentos).values(c)

  const faturamento = vRows.filter((v) => !v.cancelada).reduce((s, v) => s + Math.round(Number(v.total) * 100), 0)
  console.log(`Import vendas 2026 OK no núcleo ${nucleo.nome} (fuso ${tz}):`)
  console.log(`  vendas:      ${vRows.length} (canceladas: ${vRows.filter((v) => v.cancelada).length})`)
  console.log(`  itens:       ${iRows.length}`)
  console.log(`  produtos +:  ${novosProd.size} criados`)
  console.log(`  contas +:    ${novasContas.size} criadas`)
  console.log(`  pagamentos:  ${pRows.length} (avulso presencial)`)
  console.log(`  faturamento: R$ ${reais(faturamento)}`)
  console.log(
    `  presencial:  ${Object.entries(avulsoAssigned)
      .map(([m, c]) => `${m} R$${reais(c)}`)
      .join(' · ')}`,
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
