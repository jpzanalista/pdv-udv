import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, categorias, produtos } from '@pdv-udv/db'
import type { CreateProdutoInput, ImportProdutosInput, UpdateProdutoInput } from '@pdv-udv/shared'
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

  async atualizar(nucleoId: string, id: string, patch: UpdateProdutoInput) {
    const set: Partial<typeof produtos.$inferInsert> = {}
    if (patch.codigo !== undefined) set.codigo = patch.codigo
    if (patch.codigoBarras !== undefined) set.codigoBarras = patch.codigoBarras
    if (patch.descricao !== undefined) set.descricao = patch.descricao
    if (patch.categoriaId !== undefined) set.categoriaId = patch.categoriaId
    if (patch.precoVenda !== undefined) set.precoVenda = String(patch.precoVenda)
    if (patch.precoCusto !== undefined) set.precoCusto = String(patch.precoCusto)
    if (patch.estoqueAtual !== undefined) set.estoqueAtual = String(patch.estoqueAtual)
    if (patch.controlaEstoque !== undefined) set.controlaEstoque = patch.controlaEstoque
    if (patch.ativo !== undefined) set.ativo = patch.ativo
    if (patch.exibirVenda !== undefined) set.exibirVenda = patch.exibirVenda

    const [row] = await this.db
      .update(produtos)
      .set(set)
      .where(and(eq(produtos.nucleoId, nucleoId), eq(produtos.id, id)))
      .returning()
    if (!row) throw new NotFoundException('Produto não encontrado')
    return row
  }

  /** Import em massa via Excel: casa por código; cria categoria a partir do grupo. */
  async importar(nucleoId: string, input: ImportProdutosInput) {
    const cats = await this.db.select().from(categorias).where(eq(categorias.nucleoId, nucleoId))
    const catByNome = new Map(cats.map((c) => [c.nome.trim().toUpperCase(), c.id]))

    let criados = 0
    let atualizados = 0
    for (const r of input.produtos) {
      let categoriaId: string | null = null
      if (r.grupo?.trim()) {
        const key = r.grupo.trim().toUpperCase()
        categoriaId = catByNome.get(key) ?? null
        if (!categoriaId) {
          const [c] = await this.db
            .insert(categorias)
            .values({ nucleoId, nome: r.grupo.trim(), ordem: catByNome.size })
            .returning()
          categoriaId = c.id
          catByNome.set(key, c.id)
        }
      }

      const values = {
        nucleoId,
        categoriaId,
        codigo: r.codigo ?? null,
        codigoBarras: r.codigoBarras ?? null,
        descricao: r.descricao,
        precoVenda: String(r.precoVenda),
        precoCusto: r.precoCusto != null ? String(r.precoCusto) : '0',
        estoqueAtual: r.estoqueAtual != null ? String(r.estoqueAtual) : '0',
        controlaEstoque: r.controlaEstoque ?? false,
        ativo: r.ativo ?? true,
        exibirVenda: r.exibirVenda ?? true,
      }

      const codigo = r.codigo?.trim()
      if (codigo) {
        const [existing] = await this.db
          .select({ id: produtos.id })
          .from(produtos)
          .where(and(eq(produtos.nucleoId, nucleoId), eq(produtos.codigo, codigo)))
          .limit(1)
        if (existing) {
          await this.db.update(produtos).set(values).where(eq(produtos.id, existing.id))
          atualizados++
          continue
        }
      }
      await this.db.insert(produtos).values(values)
      criados++
    }
    return { criados, atualizados }
  }
}
