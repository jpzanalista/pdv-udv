import { Inject, Injectable } from '@nestjs/common'
import {
  type Database,
  caixaMovimentos,
  cobrancas,
  contas,
  devolucoes,
  expedientes,
  lancamentos,
  nucleos,
  pagamentos,
  produtos,
  vendaItens,
  vendas,
} from '@pdv-udv/db'
import { and, eq, inArray } from 'drizzle-orm'
import { DB } from '../db/db.module'
import { timezoneDoNucleo } from '../common/timezone'

const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)
/** Data local (YYYY-MM-DD) de um timestamp, no fuso do empório. */
const diaLocal = (d: Date, tz: string) => d.toLocaleDateString('en-CA', { timeZone: tz })

type Periodo = { de: string; ate: string }

@Injectable()
export class RelatoriosService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Período padrão: do dia 1 do mês corrente até hoje (fuso local). */
  private periodo(tz: string, de?: string, ate?: string): Periodo {
    const fim = ate || diaLocal(new Date(), tz)
    const ini = de || `${fim.slice(0, 7)}-01`
    return { de: ini, ate: fim }
  }

  /** Panorama do núcleo (independe de período). */
  async resumo(nucleoId: string) {
    const tz = await timezoneDoNucleo(this.db, nucleoId)
    const [nucleo] = await this.db
      .select({ nome: nucleos.nome })
      .from(nucleos)
      .where(eq(nucleos.id, nucleoId))
      .limit(1)

    const contasRows = await this.db
      .select({ id: contas.id, tipo: contas.tipo })
      .from(contas)
      .where(eq(contas.nucleoId, nucleoId))
    const socios = contasRows.filter((c) => c.tipo === 'socio').length
    const visitantes = contasRows.filter((c) => c.tipo === 'visitante').length

    const movs = await this.db
      .select({ contaId: lancamentos.contaId, tipo: lancamentos.tipo, valor: lancamentos.valor })
      .from(lancamentos)
      .innerJoin(contas, eq(contas.id, lancamentos.contaId))
      .where(eq(contas.nucleoId, nucleoId))
    const saldoConta = new Map<string, number>()
    let aReceberCents = 0
    for (const m of movs) {
      const c = (m.tipo === 'debito' ? 1 : -1) * toCents(m.valor)
      saldoConta.set(m.contaId, (saldoConta.get(m.contaId) ?? 0) + c)
      aReceberCents += c
    }

    const hoje = diaLocal(new Date(), tz)
    const cobsPend = await this.db
      .select({ contaId: cobrancas.contaId, dueDate: cobrancas.dueDate })
      .from(cobrancas)
      .where(and(eq(cobrancas.nucleoId, nucleoId), eq(cobrancas.status, 'pendente')))
    const vencida = new Set<string>()
    for (const c of cobsPend) if (c.contaId && c.dueDate && c.dueDate < hoje) vencida.add(c.contaId)
    let inadimplentes = 0
    for (const c of contasRows) {
      if (c.tipo === 'visitante' && (saldoConta.get(c.id) ?? 0) > 0 && vencida.has(c.id)) inadimplentes++
    }

    return { nucleoNome: nucleo?.nome ?? null, socios, visitantes, aReceberCents, inadimplentes }
  }

  private async expedientesPorDia(nucleoId: string, tz: string) {
    const exps = await this.db
      .select({ id: expedientes.id, abertoEm: expedientes.abertoEm })
      .from(expedientes)
      .where(eq(expedientes.nucleoId, nucleoId))
    const map = new Map<string, string>() // expedienteId → diaLocal
    for (const e of exps) map.set(e.id, diaLocal(e.abertoEm, tz))
    return map
  }

  async vendas(nucleoId: string, de?: string, ate?: string) {
    const tz = await timezoneDoNucleo(this.db, nucleoId)
    const p = this.periodo(tz, de, ate)
    const expDia = await this.expedientesPorDia(nucleoId, tz)

    const todas = await this.db
      .select({
        id: vendas.id,
        total: vendas.total,
        expedienteId: vendas.expedienteId,
        occurredAt: vendas.occurredAt,
        contaId: vendas.contaId,
        tipo: contas.tipo,
      })
      .from(vendas)
      .leftJoin(contas, eq(contas.id, vendas.contaId))
      .where(and(eq(vendas.nucleoId, nucleoId), eq(vendas.cancelada, false)))

    const noPeriodo = todas
      .map((v) => ({
        ...v,
        dia: (v.expedienteId && expDia.get(v.expedienteId)) || diaLocal(v.occurredAt, tz),
      }))
      .filter((v) => v.dia >= p.de && v.dia <= p.ate)

    let totalCents = 0
    const porDiaMap = new Map<string, { totalCents: number; qtd: number }>()
    for (const v of noPeriodo) {
      const c = toCents(v.total)
      totalCents += c
      const d = porDiaMap.get(v.dia) ?? { totalCents: 0, qtd: 0 }
      d.totalCents += c
      d.qtd++
      porDiaMap.set(v.dia, d)
    }
    const qtdVendas = noPeriodo.length
    const ticketMedioCents = qtdVendas ? Math.round(totalCents / qtdVendas) : 0

    // identificado × avulso (por tipo de cliente; sem conta = avulso)
    const porTipoMap = new Map<string, { totalCents: number; qtd: number }>()
    for (const v of noPeriodo) {
      const tipo = v.tipo ?? 'avulso'
      const e = porTipoMap.get(tipo) ?? { totalCents: 0, qtd: 0 }
      e.totalCents += toCents(v.total)
      e.qtd++
      porTipoMap.set(tipo, e)
    }

    // por forma de pagamento. À vista vem da tabela `pagamentos`; "na conta" (crediário)
    // não tem linha lá (vira lançamento) → é o resto: total − à vista.
    const porFormaMap = new Map<string, { totalCents: number; qtd: number }>()
    const ids = noPeriodo.map((v) => v.id)
    const comPagamento = new Set<string>()
    if (ids.length) {
      const pgs = await this.db
        .select({ vendaId: pagamentos.vendaId, metodo: pagamentos.metodo, valor: pagamentos.valor })
        .from(pagamentos)
        .where(inArray(pagamentos.vendaId, ids))
      for (const pg of pgs) {
        comPagamento.add(pg.vendaId)
        const f = porFormaMap.get(pg.metodo) ?? { totalCents: 0, qtd: 0 }
        f.totalCents += toCents(pg.valor)
        f.qtd++
        porFormaMap.set(pg.metodo, f)
      }
    }
    const avistaCents = [...porFormaMap.values()].reduce((s, f) => s + f.totalCents, 0)
    const contaCents = totalCents - avistaCents
    if (contaCents > 0) {
      porFormaMap.set('conta', { totalCents: contaCents, qtd: noPeriodo.length - comPagamento.size })
    }

    // top produtos (bruto dos itens − devoluções) + total devolvido + líquido
    const porProduto = new Map<string, { descricao: string; qtde: number; totalCents: number }>()
    let devolucoesCents = 0
    let custoCents = 0 // custo dos itens vendidos (p/ margem); custo 0 → 60% do preço
    if (ids.length) {
      const its = await this.db
        .select({
          produtoId: vendaItens.produtoId,
          descricao: vendaItens.descricao,
          qtde: vendaItens.qtde,
          total: vendaItens.total,
          precoVenda: produtos.precoVenda,
          precoCusto: produtos.precoCusto,
        })
        .from(vendaItens)
        .leftJoin(produtos, eq(produtos.id, vendaItens.produtoId))
        .where(inArray(vendaItens.vendaId, ids))
      for (const it of its) {
        const key = it.produtoId ?? it.descricao
        const e = porProduto.get(key) ?? { descricao: it.descricao, qtde: 0, totalCents: 0 }
        const qtde = Number(it.qtde)
        const totalLinha = toCents(it.total)
        e.qtde += qtde
        e.totalCents += totalLinha
        porProduto.set(key, e)
        // custo: cadastrado se > 0; senão 60% do preço de venda (ou do unitário se sem produto)
        const custoCad = toCents(it.precoCusto)
        const precoVendaUnit = it.precoVenda != null ? toCents(it.precoVenda) : qtde ? totalLinha / qtde : 0
        const custoUnit = custoCad > 0 ? custoCad : Math.round(precoVendaUnit * 0.6)
        custoCents += Math.round(custoUnit * qtde)
      }
      const devs = await this.db
        .select({ produtoId: devolucoes.produtoId, qtde: devolucoes.qtde, valor: devolucoes.valor })
        .from(devolucoes)
        .where(inArray(devolucoes.vendaId, ids))
      for (const d of devs) {
        devolucoesCents += toCents(d.valor)
        const e = d.produtoId ? porProduto.get(d.produtoId) : undefined
        if (e) {
          e.qtde -= Number(d.qtde)
          e.totalCents -= toCents(d.valor)
        }
      }
    }
    const topProdutos = [...porProduto.values()]
      .filter((e) => e.qtde > 0.0001 && e.totalCents > 0)
      .sort((a, b) => b.totalCents - a.totalCents)
    const liquidoCents = totalCents - devolucoesCents
    const margemCents = liquidoCents - custoCents

    return {
      periodo: p,
      totalCents,
      devolucoesCents,
      liquidoCents,
      custoCents,
      margemCents,
      qtdVendas,
      ticketMedioCents,
      porForma: [...porFormaMap.entries()]
        .map(([metodo, v]) => ({ metodo, ...v }))
        .sort((a, b) => b.totalCents - a.totalCents),
      porTipoCliente: [...porTipoMap.entries()]
        .map(([tipo, v]) => ({ tipo, ...v }))
        .sort((a, b) => b.totalCents - a.totalCents),
      porDia: [...porDiaMap.entries()]
        .map(([dia, v]) => ({ dia, ...v }))
        .sort((a, b) => a.dia.localeCompare(b.dia)),
      topProdutos,
    }
  }

  async financeiro(nucleoId: string, de?: string, ate?: string) {
    const tz = await timezoneDoNucleo(this.db, nucleoId)
    const p = this.periodo(tz, de, ate)
    const expDia = await this.expedientesPorDia(nucleoId, tz)

    // ----- a receber (snapshot atual) + saldo por conta -----
    const movs = await this.db
      .select({
        contaId: lancamentos.contaId,
        contaTipo: contas.tipo,
        tipo: lancamentos.tipo,
        valor: lancamentos.valor,
      })
      .from(lancamentos)
      .innerJoin(contas, eq(contas.id, lancamentos.contaId))
      .where(eq(contas.nucleoId, nucleoId))

    const saldoConta = new Map<string, number>()
    const aReceber = { socioCents: 0, visitanteCents: 0, institucionalCents: 0, totalCents: 0 }
    for (const m of movs) {
      const sign = m.tipo === 'debito' ? 1 : -1
      const c = sign * toCents(m.valor)
      saldoConta.set(m.contaId, (saldoConta.get(m.contaId) ?? 0) + c)
      if (m.contaTipo === 'socio') aReceber.socioCents += c
      else if (m.contaTipo === 'visitante') aReceber.visitanteCents += c
      else aReceber.institucionalCents += c
    }
    aReceber.totalCents = aReceber.socioCents + aReceber.visitanteCents + aReceber.institucionalCents

    // ----- inadimplência de visitantes (saldo>0 + cobrança pendente vencida) -----
    const hoje = diaLocal(new Date(), tz)
    const visitantes = await this.db
      .select({ id: contas.id })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.tipo, 'visitante')))
    const cobsPend = await this.db
      .select({ contaId: cobrancas.contaId, dueDate: cobrancas.dueDate })
      .from(cobrancas)
      .where(and(eq(cobrancas.nucleoId, nucleoId), eq(cobrancas.status, 'pendente')))
    const vencidaPorConta = new Set<string>()
    for (const c of cobsPend) if (c.contaId && c.dueDate && c.dueDate < hoje) vencidaPorConta.add(c.contaId)
    const inadimplencia = { qtd: 0, valorCents: 0 }
    for (const v of visitantes) {
      const saldo = saldoConta.get(v.id) ?? 0
      if (saldo > 0 && vencidaPorConta.has(v.id)) {
        inadimplencia.qtd++
        inadimplencia.valorCents += saldo
      }
    }

    // ----- caixa no período (por dia do expediente) -----
    const movsCaixa = await this.db
      .select({
        tipo: caixaMovimentos.tipo,
        destino: caixaMovimentos.destino,
        valor: caixaMovimentos.valor,
        expedienteId: caixaMovimentos.expedienteId,
      })
      .from(caixaMovimentos)
      .where(eq(caixaMovimentos.nucleoId, nucleoId))
    const caixa = { sangriaTesourariaCents: 0, sangriaCompraCents: 0, suprimentoCents: 0 }
    for (const m of movsCaixa) {
      const dia = expDia.get(m.expedienteId)
      if (!dia || dia < p.de || dia > p.ate) continue
      const c = toCents(m.valor)
      if (m.tipo === 'suprimento') caixa.suprimentoCents += c
      else if (m.destino === 'compra') caixa.sangriaCompraCents += c
      else caixa.sangriaTesourariaCents += c
    }

    // fechamentos no período (diferença)
    const exps = await this.db
      .select({ id: expedientes.id, abertoEm: expedientes.abertoEm, status: expedientes.status, diferenca: expedientes.diferenca })
      .from(expedientes)
      .where(eq(expedientes.nucleoId, nucleoId))
    const fechamentos: { dia: string; diferencaCents: number }[] = []
    let diferencaTotalCents = 0
    for (const e of exps) {
      if (e.status !== 'fechado') continue
      const dia = diaLocal(e.abertoEm, tz)
      if (dia < p.de || dia > p.ate) continue
      const dif = toCents(e.diferenca)
      diferencaTotalCents += dif
      fechamentos.push({ dia, diferencaCents: dif })
    }
    fechamentos.sort((a, b) => a.dia.localeCompare(b.dia))

    // ----- cobranças ASAAS no período -----
    const cobs = await this.db
      .select({ status: cobrancas.status, valor: cobrancas.valor, createdAt: cobrancas.createdAt })
      .from(cobrancas)
      .where(eq(cobrancas.nucleoId, nucleoId))
    const cobrancasResumo = { pendentes: 0, pendentesCents: 0, confirmadas: 0, confirmadasCents: 0 }
    for (const c of cobs) {
      const dia = diaLocal(c.createdAt, tz)
      if (dia < p.de || dia > p.ate) continue
      const cents = toCents(c.valor)
      if (c.status === 'confirmada') {
        cobrancasResumo.confirmadas++
        cobrancasResumo.confirmadasCents += cents
      } else if (c.status === 'pendente') {
        cobrancasResumo.pendentes++
        cobrancasResumo.pendentesCents += cents
      }
    }

    return {
      periodo: p,
      aReceber,
      inadimplencia,
      caixa: { ...caixa, fechamentos, diferencaTotalCents },
      cobrancas: cobrancasResumo,
    }
  }
}
