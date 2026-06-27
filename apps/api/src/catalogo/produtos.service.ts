import { Inject, Injectable } from '@nestjs/common'
import { type Database, produtos } from '@pdv-udv/db'
import type { CreateProdutoInput } from '@pdv-udv/shared'
import { and, asc, eq } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class ProdutosService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, input: CreateProdutoInput) {
    const [row] = await this.db
      .insert(produtos)
      .values({
        nucleoId,
        descricao: input.descricao,
        categoriaId: input.categoriaId,
        codigo: input.codigo,
        codigoBarras: input.codigoBarras,
        precoVenda: String(input.precoVenda),
        precoCusto: input.precoCusto != null ? String(input.precoCusto) : undefined,
        controlaEstoque: input.controlaEstoque,
        estoqueAtual: input.estoqueAtual != null ? String(input.estoqueAtual) : undefined,
        ativo: input.ativo,
        exibirVenda: input.exibirVenda,
      })
      .returning()
    return row
  }

  list(nucleoId: string, categoriaId?: string) {
    const where = categoriaId
      ? and(eq(produtos.nucleoId, nucleoId), eq(produtos.categoriaId, categoriaId))
      : eq(produtos.nucleoId, nucleoId)
    return this.db.select().from(produtos).where(where).orderBy(asc(produtos.descricao))
  }
}
