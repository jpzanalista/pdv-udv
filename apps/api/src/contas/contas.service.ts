import { Inject, Injectable } from '@nestjs/common'
import { type Database, contaMembros, contas } from '@pdv-udv/db'
import type { CreateContaInput } from '@pdv-udv/shared'
import { and, eq } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class ContasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, input: CreateContaInput) {
    const [conta] = await this.db
      .insert(contas)
      .values({
        nucleoId,
        tipo: input.tipo,
        nome: input.nome,
        titularPessoaId: input.titularPessoaId,
        descontoPct: input.descontoPct != null ? String(input.descontoPct) : undefined,
      })
      .returning()

    if (input.membros?.length) {
      await this.db
        .insert(contaMembros)
        .values(input.membros.map((pessoaId) => ({ contaId: conta.id, pessoaId })))
    }
    return conta
  }

  list(nucleoId: string) {
    return this.db.select().from(contas).where(eq(contas.nucleoId, nucleoId))
  }

  get(nucleoId: string, id: string) {
    return this.db
      .select()
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
  }
}
