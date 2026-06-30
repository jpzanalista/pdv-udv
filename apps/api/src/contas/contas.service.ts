import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  type Database,
  cobrancas,
  contaMembros,
  contas,
  corteItens,
  lancamentos,
  pessoas,
  vendaItens,
  vendas,
} from '@pdv-udv/db'
import type {
  CreateContaInput,
  ImportContasInput,
  RegistrarPagamentoInput,
  UpdateContaInput,
} from '@pdv-udv/shared'
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { DB } from '../db/db.module'

const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)
const toReais = (cents: number) => (cents / 100).toFixed(2)

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
}

@Injectable()
export class ContasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, input: CreateContaInput) {
    const titularPessoaId = await this.titularParaConta(
      input.tipo,
      input.cpf,
      input.whatsapp,
      input.nome.trim(),
      input.titularPessoaId,
    )

    return this.db.transaction(async (tx) => {
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${contas.codigo}), 0)` })
        .from(contas)
        .where(eq(contas.nucleoId, nucleoId))
      const codigo = Number(max) + 1

      const [conta] = await tx
        .insert(contas)
        .values({
          nucleoId,
          codigo,
          tipo: input.tipo,
          nome: input.nome,
          titularPessoaId,
          descontoPct: input.descontoPct != null ? String(input.descontoPct) : undefined,
          ativa: input.ativa ?? undefined,
        })
        .returning()

      if (input.membros?.length) {
        await tx
          .insert(contaMembros)
          .values(input.membros.map((pessoaId) => ({ contaId: conta.id, pessoaId })))
      }
      return conta
    })
  }

  /** Titular da conta: por CPF (dedup) ou, p/ sócio/visitante sem CPF, um titular só com nome+WhatsApp. */
  private async titularParaConta(
    tipo: string,
    cpf: string | undefined,
    whatsapp: string | undefined,
    nome: string,
    titularExistente?: string,
  ): Promise<string | undefined> {
    if (cpf) return this.resolverTitular(cpf, whatsapp, nome)
    if (titularExistente) return titularExistente
    if (tipo === 'socio' || tipo === 'visitante') return this.criarTitularSemCpf(nome, whatsapp)
    return undefined
  }

  /** Cria uma pessoa titular sem CPF (só nome + WhatsApp). CPF entra depois (sócio ou admin). */
  private async criarTitularSemCpf(nome: string, whatsapp: string | undefined): Promise<string> {
    const [p] = await this.db
      .insert(pessoas)
      .values({ nome: nome.trim(), whatsapp: whatsapp ?? undefined })
      .returning({ id: pessoas.id })
    return p.id
  }

  async atualizar(nucleoId: string, id: string, patch: UpdateContaInput) {
    const [atual] = await this.db
      .select({ id: contas.id, nome: contas.nome, titularPessoaId: contas.titularPessoaId })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
    if (!atual) throw new NotFoundException('Conta não encontrada')

    const set: Partial<typeof contas.$inferInsert> = {}
    if (patch.nome !== undefined) set.nome = patch.nome
    if (patch.tipo !== undefined) set.tipo = patch.tipo
    if (patch.ativa !== undefined) set.ativa = patch.ativa
    if (patch.descontoPct !== undefined) set.descontoPct = String(patch.descontoPct)

    const cpfDigits = patch.cpf?.replace(/\D/g, '')
    if (atual.titularPessoaId) {
      // edita a pessoa titular existente (nome/CPF/WhatsApp do sócio/visitante)
      const pset: Partial<typeof pessoas.$inferInsert> = {}
      if (patch.nome !== undefined) pset.nome = patch.nome
      if (patch.whatsapp !== undefined) pset.whatsapp = patch.whatsapp
      if (cpfDigits) {
        if (cpfDigits.length !== 11) throw new BadRequestException('CPF deve ter 11 dígitos')
        const [outro] = await this.db
          .select({ id: pessoas.id })
          .from(pessoas)
          .where(and(eq(pessoas.cpf, cpfDigits), ne(pessoas.id, atual.titularPessoaId)))
          .limit(1)
        if (outro) throw new BadRequestException('CPF já cadastrado para outra pessoa')
        pset.cpf = cpfDigits
      }
      if (Object.keys(pset).length) {
        await this.db.update(pessoas).set(pset).where(eq(pessoas.id, atual.titularPessoaId))
      }
    } else if (cpfDigits || patch.whatsapp !== undefined) {
      // sem titular ainda → cria (com CPF se houver; senão só nome + WhatsApp) e vincula
      const titularPessoaId = cpfDigits
        ? await this.resolverTitular(patch.cpf, patch.whatsapp, patch.nome ?? atual.nome)
        : await this.criarTitularSemCpf(patch.nome ?? atual.nome, patch.whatsapp)
      if (titularPessoaId) set.titularPessoaId = titularPessoaId
    }

    if (Object.keys(set).length === 0) {
      const [row] = await this.db
        .select()
        .from(contas)
        .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
        .limit(1)
      return row
    }
    const [row] = await this.db
      .update(contas)
      .set(set)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .returning()
    return row
  }

  /** Exclui a conta — só quando NÃO há histórico (vendas/lançamentos/cobranças/fechamento). */
  async excluir(nucleoId: string, id: string) {
    const [conta] = await this.db
      .select({ id: contas.id })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
    if (!conta) throw new NotFoundException('Conta não encontrada')

    const [v] = await this.db.select({ id: vendas.id }).from(vendas).where(eq(vendas.contaId, id)).limit(1)
    const [l] = await this.db
      .select({ id: lancamentos.id })
      .from(lancamentos)
      .where(eq(lancamentos.contaId, id))
      .limit(1)
    const [cb] = await this.db
      .select({ id: cobrancas.id })
      .from(cobrancas)
      .where(eq(cobrancas.contaId, id))
      .limit(1)
    const [ci] = await this.db
      .select({ id: corteItens.id })
      .from(corteItens)
      .where(eq(corteItens.contaId, id))
      .limit(1)
    if (v || l || cb || ci) {
      throw new BadRequestException(
        'Conta com histórico não pode ser excluída. Desative-a em vez de excluir.',
      )
    }

    await this.db.delete(contaMembros).where(eq(contaMembros.contaId, id))
    await this.db.delete(contas).where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
    return { ok: true }
  }

  list(nucleoId: string) {
    return this.db
      .select({
        id: contas.id,
        codigo: contas.codigo,
        nome: contas.nome,
        tipo: contas.tipo,
        descontoPct: contas.descontoPct,
        ativa: contas.ativa,
        createdAt: contas.createdAt,
        titularNome: pessoas.nome,
        titularCpf: pessoas.cpf,
        titularWhatsapp: pessoas.whatsapp,
      })
      .from(contas)
      .leftJoin(pessoas, eq(contas.titularPessoaId, pessoas.id))
      .where(eq(contas.nucleoId, nucleoId))
      .orderBy(asc(contas.nome))
  }

  get(nucleoId: string, id: string) {
    return this.db
      .select()
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
  }

  /** Extrato: saldo em aberto + movimentos (compras com itens, e pagamentos). */
  async extrato(nucleoId: string, id: string) {
    const [conta] = await this.db
      .select({
        id: contas.id,
        nome: contas.nome,
        tipo: contas.tipo,
        whatsapp: pessoas.whatsapp, // do titular — sugestão p/ (re)envio de recibo
      })
      .from(contas)
      .leftJoin(pessoas, eq(pessoas.id, contas.titularPessoaId))
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
    if (!conta) throw new NotFoundException('Conta não encontrada')

    const movs = await this.db
      .select()
      .from(lancamentos)
      .where(and(eq(lancamentos.nucleoId, nucleoId), eq(lancamentos.contaId, id)))
      .orderBy(desc(lancamentos.createdAt))

    // Busca os itens das vendas vinculadas (o "o que comprou"), em uma tacada só.
    const vendaIds = movs.map((m) => m.vendaId).filter((v): v is string => !!v)
    const numeroByVenda = new Map<string, number>()
    const canceladaByVenda = new Map<string, boolean>()
    const reciboByVenda = new Map<string, { enviadoEm: Date | null; telefone: string | null }>()
    const itensByVenda = new Map<string, { descricao: string; qtde: number; totalCents: number }[]>()
    if (vendaIds.length) {
      const vs = await this.db
        .select({
          id: vendas.id,
          numero: vendas.numero,
          cancelada: vendas.cancelada,
          reciboEnviadoEm: vendas.reciboEnviadoEm,
          reciboTelefone: vendas.reciboTelefone,
        })
        .from(vendas)
        .where(inArray(vendas.id, vendaIds))
      for (const v of vs) {
        numeroByVenda.set(v.id, v.numero)
        canceladaByVenda.set(v.id, v.cancelada)
        reciboByVenda.set(v.id, { enviadoEm: v.reciboEnviadoEm, telefone: v.reciboTelefone })
      }
      const its = await this.db.select().from(vendaItens).where(inArray(vendaItens.vendaId, vendaIds))
      for (const it of its) {
        const arr = itensByVenda.get(it.vendaId) ?? []
        arr.push({ descricao: it.descricao, qtde: Number(it.qtde), totalCents: toCents(it.total) })
        itensByVenda.set(it.vendaId, arr)
      }
    }

    let saldoCents = 0
    const movimentos = movs.map((m) => {
      const valorCents = toCents(m.valor)
      saldoCents += m.tipo === 'debito' ? valorCents : -valorCents
      const venda = m.vendaId
        ? {
            id: m.vendaId,
            numero: numeroByVenda.get(m.vendaId) ?? null,
            cancelada: canceladaByVenda.get(m.vendaId) ?? false,
            reciboEnviadoEm: reciboByVenda.get(m.vendaId)?.enviadoEm ?? null,
            reciboTelefone: reciboByVenda.get(m.vendaId)?.telefone ?? null,
            itens: itensByVenda.get(m.vendaId) ?? [],
          }
        : null
      return { id: m.id, data: m.createdAt, tipo: m.tipo, valorCents, descricao: m.descricao, venda }
    })

    return { conta, saldoCents, movimentos }
  }

  /** Registra um pagamento presencial (baixa) → lançamento crédito que abate o saldo. */
  async registrarPagamento(nucleoId: string, id: string, input: RegistrarPagamentoInput) {
    const [conta] = await this.db
      .select({ id: contas.id })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
    if (!conta) throw new NotFoundException('Conta não encontrada')

    const descricao =
      input.descricao ??
      `Pagamento${input.metodo ? ` — ${METODO_LABEL[input.metodo] ?? input.metodo}` : ''}`

    const [row] = await this.db
      .insert(lancamentos)
      .values({
        nucleoId,
        contaId: id,
        tipo: 'credito',
        valor: toReais(input.valorCents),
        descricao,
      })
      .returning({ id: lancamentos.id })
    return { ok: true, lancamentoId: row.id }
  }

  /**
   * Import em massa via Excel (ex.: clientes do TaurusPOS).
   * Dedupe por nome dentro do núcleo (re-import é idempotente).
   * Se houver CPF (11 dígitos), faz upsert da pessoa por CPF e a liga como titular.
   */
  async importar(nucleoId: string, input: ImportContasInput) {
    const existentes = await this.db
      .select({ id: contas.id, nome: contas.nome })
      .from(contas)
      .where(eq(contas.nucleoId, nucleoId))
    const byNome = new Map(existentes.map((c) => [c.nome.trim().toLowerCase(), c.id]))

    const [{ max }] = await this.db
      .select({ max: sql<number>`coalesce(max(${contas.codigo}), 0)` })
      .from(contas)
      .where(eq(contas.nucleoId, nucleoId))
    let codigo = Number(max)

    let criadas = 0
    let atualizadas = 0
    for (const r of input.contas) {
      const nome = r.nome.trim()
      const nomeKey = nome.toLowerCase()
      const tipo = r.tipo ?? 'socio'
      const descontoPct = r.descontoPct != null ? String(r.descontoPct) : undefined

      const existingId = byNome.get(nomeKey)
      if (existingId) {
        const set: Partial<typeof contas.$inferInsert> = { tipo }
        // só mexe no titular se vier CPF (evita duplicar pessoa a cada re-import sem CPF)
        if (r.cpf) {
          const t = await this.resolverTitular(r.cpf, r.whatsapp, nome)
          if (t) set.titularPessoaId = t
        }
        if (descontoPct != null) set.descontoPct = descontoPct
        await this.db.update(contas).set(set).where(eq(contas.id, existingId))
        atualizadas++
      } else {
        const titularPessoaId = await this.titularParaConta(tipo, r.cpf, r.whatsapp, nome)
        codigo++
        const [c] = await this.db
          .insert(contas)
          .values({ nucleoId, codigo, tipo, nome, titularPessoaId, descontoPct })
          .returning({ id: contas.id })
        byNome.set(nomeKey, c.id)
        criadas++
      }
    }
    return { criadas, atualizadas }
  }

  /** Resolve (ou cria) a pessoa titular pelo CPF. Sem CPF de 11 dígitos → sem titular. */
  private async resolverTitular(
    cpfRaw: string | undefined,
    whatsapp: string | undefined,
    nome: string,
  ): Promise<string | undefined> {
    const cpf = cpfRaw?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) return undefined

    const [existing] = await this.db
      .select({ id: pessoas.id })
      .from(pessoas)
      .where(eq(pessoas.cpf, cpf))
      .limit(1)
    if (existing) {
      if (whatsapp) {
        await this.db.update(pessoas).set({ whatsapp }).where(eq(pessoas.id, existing.id))
      }
      return existing.id
    }

    const [p] = await this.db
      .insert(pessoas)
      .values({ cpf, nome: nome.trim(), whatsapp: whatsapp ?? undefined })
      .returning({ id: pessoas.id })
    return p.id
  }
}
