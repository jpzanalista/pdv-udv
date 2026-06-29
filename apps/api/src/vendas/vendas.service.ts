import { randomUUID } from 'node:crypto'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  type Database,
  contas,
  devolucoes,
  estoqueMovimentos,
  expedientes,
  lancamentos,
  pagamentos,
  produtos,
  vendaItens,
  vendas,
} from '@pdv-udv/db'
import type { CreateVendaInput, DevolverVendaInput } from '@pdv-udv/shared'
import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { DB } from '../db/db.module'

const reais = (cents: number) => (cents / 100).toFixed(2)
const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)

@Injectable()
export class VendasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, createdBy: string, input: CreateVendaInput) {
    const subtotal = input.itens.reduce((a, i) => a + Math.round(i.qtde * i.unitarioCents), 0)
    const desconto = input.descontoCents ?? 0
    const total = Math.max(0, subtotal - desconto)

    return this.db.transaction(async (tx) => {
      const [exp] = await tx
        .select()
        .from(expedientes)
        .where(and(eq(expedientes.nucleoId, nucleoId), eq(expedientes.status, 'aberto')))
        .limit(1)
      if (!exp) throw new BadRequestException('Abra o caixa antes de vender')

      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${vendas.numero}), 0)` })
        .from(vendas)
        .where(eq(vendas.nucleoId, nucleoId))
      const numero = Number(max) + 1
      const vendaId = randomUUID()

      const [venda] = await tx
        .insert(vendas)
        .values({
          id: vendaId,
          nucleoId,
          expedienteId: exp.id,
          terminalId: exp.terminalId,
          numero,
          personKind: input.personKind ?? null,
          pessoaId: input.pessoaId ?? null,
          contaId: input.contaId ?? null,
          total: reais(total),
          desconto: reais(desconto),
          occurredAt: new Date(),
          createdBy,
        })
        .returning()

      await tx.insert(vendaItens).values(
        input.itens.map((i) => ({
          id: randomUUID(),
          vendaId,
          produtoId: i.produtoId,
          descricao: i.descricao,
          qtde: String(i.qtde),
          unitario: reais(i.unitarioCents),
          total: reais(Math.round(i.qtde * i.unitarioCents)),
        })),
      )

      for (const pg of input.pagamentos) {
        if (pg.metodo === 'conta') {
          if (!input.contaId) throw new BadRequestException('"Lançar na conta" exige uma conta')
          await tx.insert(lancamentos).values({
            nucleoId,
            contaId: input.contaId,
            tipo: 'debito',
            valor: reais(pg.valorCents),
            vendaId,
            descricao: `Venda #${numero}`,
          })
        } else {
          await tx.insert(pagamentos).values({
            vendaId,
            metodo: pg.metodo,
            valor: reais(pg.valorCents),
          })
        }
      }

      // Baixa de estoque só para produtos com controla_estoque (permite negativo).
      for (const i of input.itens) {
        await tx
          .update(produtos)
          .set({ estoqueAtual: sql`${produtos.estoqueAtual} - ${i.qtde}` })
          .where(and(eq(produtos.id, i.produtoId), eq(produtos.controlaEstoque, true)))
      }

      return { id: venda.id, numero: venda.numero, total: venda.total }
    })
  }

  list(nucleoId: string) {
    return this.db
      .select()
      .from(vendas)
      .where(eq(vendas.nucleoId, nucleoId))
      .orderBy(desc(vendas.numero))
      .limit(50)
  }

  /** Vendas do expediente aberto (para devolução): itens + quanto já foi devolvido. */
  async recentes(nucleoId: string) {
    const [exp] = await this.db
      .select({ id: expedientes.id })
      .from(expedientes)
      .where(and(eq(expedientes.nucleoId, nucleoId), eq(expedientes.status, 'aberto')))
      .limit(1)
    if (!exp) return []

    const vs = await this.db
      .select({ id: vendas.id, numero: vendas.numero, total: vendas.total, contaId: vendas.contaId })
      .from(vendas)
      .where(and(eq(vendas.expedienteId, exp.id), eq(vendas.cancelada, false)))
      .orderBy(desc(vendas.numero))
      .limit(50)
    if (!vs.length) return []

    const ids = vs.map((v) => v.id)
    const itens = await this.db.select().from(vendaItens).where(inArray(vendaItens.vendaId, ids))
    const devs = await this.db
      .select({ vendaItemId: devolucoes.vendaItemId, qtde: devolucoes.qtde })
      .from(devolucoes)
      .where(inArray(devolucoes.vendaId, ids))
    const pgs = await this.db
      .select({ vendaId: pagamentos.vendaId, metodo: pagamentos.metodo })
      .from(pagamentos)
      .where(inArray(pagamentos.vendaId, ids))

    const devByItem = new Map<string, number>()
    for (const d of devs) devByItem.set(d.vendaItemId, (devByItem.get(d.vendaItemId) ?? 0) + Number(d.qtde))
    const metodoByVenda = new Map(pgs.map((p) => [p.vendaId, p.metodo as string]))

    return vs.map((v) => ({
      id: v.id,
      numero: v.numero,
      totalCents: toCents(v.total),
      metodo: metodoByVenda.get(v.id) ?? 'conta', // sem pagamento à vista → foi "na conta"
      itens: itens
        .filter((i) => i.vendaId === v.id)
        .map((i) => ({
          id: i.id,
          descricao: i.descricao,
          qtde: Number(i.qtde),
          unitarioCents: toCents(i.unitario),
          devolvido: devByItem.get(i.id) ?? 0,
        })),
    }))
  }

  /** Devolução parcial item a item: estorna estoque + financeiro conforme o método. */
  async devolver(nucleoId: string, vendaId: string, input: DevolverVendaInput) {
    return this.db.transaction(async (tx) => {
      const [exp] = await tx
        .select({ id: expedientes.id })
        .from(expedientes)
        .where(and(eq(expedientes.nucleoId, nucleoId), eq(expedientes.status, 'aberto')))
        .limit(1)
      if (!exp) throw new BadRequestException('Abra o caixa para registrar a devolução')

      const [venda] = await tx
        .select({ id: vendas.id, numero: vendas.numero, contaId: vendas.contaId })
        .from(vendas)
        .where(and(eq(vendas.nucleoId, nucleoId), eq(vendas.id, vendaId), eq(vendas.cancelada, false)))
        .limit(1)
      if (!venda) throw new NotFoundException('Venda não encontrada')

      // método da venda: pagamento à vista, senão "conta"
      const [pg] = await tx
        .select({ metodo: pagamentos.metodo })
        .from(pagamentos)
        .where(eq(pagamentos.vendaId, vendaId))
        .limit(1)
      const metodo = (pg?.metodo ?? 'conta') as 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'conta'

      let totalCents = 0
      for (const it of input.itens) {
        const [item] = await tx
          .select()
          .from(vendaItens)
          .where(and(eq(vendaItens.id, it.vendaItemId), eq(vendaItens.vendaId, vendaId)))
          .limit(1)
        if (!item) throw new BadRequestException('Item não pertence a esta venda')

        const [{ soma }] = await tx
          .select({ soma: sql<string>`coalesce(sum(${devolucoes.qtde}), 0)` })
          .from(devolucoes)
          .where(eq(devolucoes.vendaItemId, it.vendaItemId))
        const disponivel = Number(item.qtde) - Number(soma)
        if (it.qtde > disponivel + 1e-9) {
          throw new BadRequestException(`Quantidade indisponível para devolução (resta ${disponivel})`)
        }

        const valorCents = Math.round(it.qtde * toCents(item.unitario))
        totalCents += valorCents

        // devolve estoque (só produtos com controle) e registra movimento
        if (item.produtoId) {
          const [prod] = await tx
            .select({ controla: produtos.controlaEstoque, atual: produtos.estoqueAtual })
            .from(produtos)
            .where(eq(produtos.id, item.produtoId))
            .limit(1)
          if (prod?.controla) {
            const saldo = Number(prod.atual) + it.qtde
            await tx.update(produtos).set({ estoqueAtual: String(saldo) }).where(eq(produtos.id, item.produtoId))
            await tx.insert(estoqueMovimentos).values({
              nucleoId,
              produtoId: item.produtoId,
              tipo: 'entrada',
              qtde: String(it.qtde),
              saldoApos: String(saldo),
              motivo: `Devolução venda #${venda.numero}`,
            })
          }
        }

        await tx.insert(devolucoes).values({
          nucleoId,
          expedienteId: exp.id,
          vendaId,
          vendaItemId: it.vendaItemId,
          produtoId: item.produtoId,
          qtde: String(it.qtde),
          valor: reais(valorCents),
          metodo,
          motivo: input.motivo,
        })
      }

      // estorno financeiro: "na conta" gera crédito; dinheiro abate o caixa; pix/cartão é reembolso externo
      if (metodo === 'conta' && venda.contaId) {
        await tx.insert(lancamentos).values({
          nucleoId,
          contaId: venda.contaId,
          tipo: 'credito',
          valor: reais(totalCents),
          vendaId,
          descricao: `Estorno venda #${venda.numero}`,
        })
      }

      return { ok: true, totalCents, metodo }
    })
  }

  /** Cancela a venda inteira: estorna o restante (não-devolvido) e marca cancelada. */
  async cancelar(nucleoId: string, vendaId: string, motivo: string) {
    return this.db.transaction(async (tx) => {
      const [exp] = await tx
        .select({ id: expedientes.id })
        .from(expedientes)
        .where(and(eq(expedientes.nucleoId, nucleoId), eq(expedientes.status, 'aberto')))
        .limit(1)
      if (!exp) throw new BadRequestException('Abra o caixa para registrar o cancelamento')

      const [venda] = await tx
        .select({ id: vendas.id, numero: vendas.numero, contaId: vendas.contaId })
        .from(vendas)
        .where(and(eq(vendas.nucleoId, nucleoId), eq(vendas.id, vendaId), eq(vendas.cancelada, false)))
        .limit(1)
      if (!venda) throw new NotFoundException('Venda não encontrada ou já cancelada')

      const [pg] = await tx
        .select({ metodo: pagamentos.metodo })
        .from(pagamentos)
        .where(eq(pagamentos.vendaId, vendaId))
        .limit(1)
      const metodo = (pg?.metodo ?? 'conta') as 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'conta'

      const itens = await tx.select().from(vendaItens).where(eq(vendaItens.vendaId, vendaId))
      const devs = await tx
        .select({ vendaItemId: devolucoes.vendaItemId, qtde: devolucoes.qtde })
        .from(devolucoes)
        .where(eq(devolucoes.vendaId, vendaId))
      const devByItem = new Map<string, number>()
      for (const d of devs) devByItem.set(d.vendaItemId, (devByItem.get(d.vendaItemId) ?? 0) + Number(d.qtde))

      let totalCents = 0
      for (const item of itens) {
        const restante = Number(item.qtde) - (devByItem.get(item.id) ?? 0)
        if (restante <= 1e-9) continue
        const valorCents = Math.round(restante * toCents(item.unitario))
        totalCents += valorCents

        if (item.produtoId) {
          const [prod] = await tx
            .select({ controla: produtos.controlaEstoque, atual: produtos.estoqueAtual })
            .from(produtos)
            .where(eq(produtos.id, item.produtoId))
            .limit(1)
          if (prod?.controla) {
            const saldo = Number(prod.atual) + restante
            await tx.update(produtos).set({ estoqueAtual: String(saldo) }).where(eq(produtos.id, item.produtoId))
            await tx.insert(estoqueMovimentos).values({
              nucleoId,
              produtoId: item.produtoId,
              tipo: 'entrada',
              qtde: String(restante),
              saldoApos: String(saldo),
              motivo: `Cancelamento venda #${venda.numero}`,
            })
          }
        }
        await tx.insert(devolucoes).values({
          nucleoId,
          expedienteId: exp.id,
          vendaId,
          vendaItemId: item.id,
          produtoId: item.produtoId,
          qtde: String(restante),
          valor: reais(valorCents),
          metodo,
          motivo: `Cancelamento: ${motivo}`,
        })
      }

      if (metodo === 'conta' && venda.contaId && totalCents > 0) {
        await tx.insert(lancamentos).values({
          nucleoId,
          contaId: venda.contaId,
          tipo: 'credito',
          valor: reais(totalCents),
          vendaId,
          descricao: `Cancelamento venda #${venda.numero}`,
        })
      }

      await tx
        .update(vendas)
        .set({ cancelada: true, motivoCancelamento: motivo })
        .where(and(eq(vendas.nucleoId, nucleoId), eq(vendas.id, vendaId)))

      return { ok: true, totalCents }
    })
  }

  /** Consulta de vendas por período + filtros (Consultar Vendas). */
  async consulta(
    nucleoId: string,
    f: { de?: string; ate?: string; situacao?: string; numero?: string; cliente?: string },
  ) {
    const conds = [eq(vendas.nucleoId, nucleoId)]
    if (f.de) conds.push(sql`(${vendas.occurredAt} at time zone 'America/Sao_Paulo')::date >= ${f.de}`)
    if (f.ate) conds.push(sql`(${vendas.occurredAt} at time zone 'America/Sao_Paulo')::date <= ${f.ate}`)
    if (f.numero) conds.push(eq(vendas.numero, Number(f.numero)))
    if (f.situacao === 'autorizada') conds.push(eq(vendas.cancelada, false))
    if (f.situacao === 'cancelada') conds.push(eq(vendas.cancelada, true))
    if (f.cliente?.trim()) conds.push(ilike(contas.nome, `%${f.cliente.trim()}%`))

    const rows = await this.db
      .select({
        id: vendas.id,
        numero: vendas.numero,
        occurredAt: vendas.occurredAt,
        cancelada: vendas.cancelada,
        desconto: vendas.desconto,
        total: vendas.total,
        cliente: contas.nome,
      })
      .from(vendas)
      .leftJoin(contas, eq(contas.id, vendas.contaId))
      .where(and(...conds))
      .orderBy(desc(vendas.occurredAt))
      .limit(300)

    const ids = rows.map((r) => r.id)
    const pgs = ids.length
      ? await this.db
          .select({ vendaId: pagamentos.vendaId, metodo: pagamentos.metodo })
          .from(pagamentos)
          .where(inArray(pagamentos.vendaId, ids))
      : []
    const metodoByVenda = new Map(pgs.map((p) => [p.vendaId, p.metodo as string]))

    return rows.map((r) => ({
      id: r.id,
      numero: r.numero,
      data: r.occurredAt,
      situacao: r.cancelada ? ('cancelada' as const) : ('autorizada' as const),
      cliente: r.cliente ?? null,
      descontoCents: toCents(r.desconto),
      totalCents: toCents(r.total),
      metodo: metodoByVenda.get(r.id) ?? 'conta',
    }))
  }

  /** Itens de uma venda (para expandir na consulta). */
  async itens(nucleoId: string, vendaId: string) {
    const [v] = await this.db
      .select({ id: vendas.id })
      .from(vendas)
      .where(and(eq(vendas.nucleoId, nucleoId), eq(vendas.id, vendaId)))
      .limit(1)
    if (!v) throw new NotFoundException('Venda não encontrada')
    const its = await this.db
      .select({
        descricao: vendaItens.descricao,
        qtde: vendaItens.qtde,
        unitario: vendaItens.unitario,
        total: vendaItens.total,
      })
      .from(vendaItens)
      .where(eq(vendaItens.vendaId, vendaId))
    return its.map((i) => ({
      descricao: i.descricao,
      qtde: Number(i.qtde),
      unitarioCents: toCents(i.unitario),
      totalCents: toCents(i.total),
    }))
  }
}
