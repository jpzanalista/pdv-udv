import { Inject, Injectable } from '@nestjs/common'
import { type Database, pessoas } from '@pdv-udv/db'
import type { CreatePessoaInput } from '@pdv-udv/shared'
import { eq } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class PessoasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(input: CreatePessoaInput) {
    const [row] = await this.db.insert(pessoas).values(input).returning()
    return row
  }

  findByCpf(cpf: string) {
    return this.db.select().from(pessoas).where(eq(pessoas.cpf, cpf)).limit(1)
  }

  list() {
    return this.db.select().from(pessoas).limit(200)
  }
}
