import { Inject, Injectable } from '@nestjs/common'
import { type Database, categorias } from '@pdv-udv/db'
import type { CreateCategoriaInput } from '@pdv-udv/shared'
import { asc, eq } from 'drizzle-orm'
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
}
