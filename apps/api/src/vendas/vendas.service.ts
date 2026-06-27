import { randomUUID } from 'node:crypto'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import {
  type Database,
  expedientes,
  lancamentos,
  pagamentos,
  produtos,
  vendaItens,
  vendas,
} from '@pdv-udv/db'
import type { CreateVendaInput } from '@pdv-udv/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DB } from '../db/db.module'

const reais = (cents: number) => (cents / 100).toFixed(2)

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
}
