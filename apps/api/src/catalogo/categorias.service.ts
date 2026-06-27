import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, categorias, produtos } from '@pdv-udv/db'
import type { CreateCategoriaInput, UpdateCategoriaInput } from '@pdv-udv/shared'
import { and, asc, eq } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class CategoriasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, input: CreateCategoriaInput) {
    const [row] = await this.db
      .insert(categorias)
      .values({ nucleoId, nome: input.nome, ordem: input.ordem ?? 0 })
      .returning()
    return row
  }

  list(nucleoId: string) {
    return this.db
      .select()
      .from(categorias)
      .where(eq(categorias.nucleoId, nucleoId))
      .orderBy(asc(categorias.ordem), asc(categorias.nome))
  }

  async atualizar(nucleoId: string, id: string, patch: UpdateCategoriaInput) {
    const set: Partial<typeof categorias.$inferInsert> = {}
    if (patch.nome !== undefined) set.nome = patch.nome
    if (patch.ordem !== undefined) set.ordem = patch.ordem
    const [row] = await this.db
      .update(categorias)
      .set(set)
      .where(and(eq(categorias.nucleoId, nucleoId), eq(categorias.id, id)))
      .returning()
    if (!row) throw new NotFoundException('Categoria não encontrada')
    return row
  }

  async excluir(nucleoId: string, id: string) {
    const [emUso] = await this.db
      .select({ id: produtos.id })
      .from(produtos)
      .where(and(eq(produtos.nucleoId, nucleoId), eq(produtos.categoriaId, id)))
      .limit(1)
    if (emUso) throw new BadRequestException('Categoria em uso por produtos — mova-os antes de excluir')
    const [row] = await this.db
      .delete(categorias)
      .where(and(eq(categorias.nucleoId, nucleoId), eq(categorias.id, id)))
      .returning()
    if (!row) throw new NotFoundException('Categoria não encontrada')
    return { ok: true }
  }
}
