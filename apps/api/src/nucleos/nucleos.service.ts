import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, nucleos } from '@pdv-udv/db'
import type { CreateNucleoInput, NucleoConfigInput } from '@pdv-udv/shared'
import { eq } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class NucleosService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(input: CreateNucleoInput) {
    const [row] = await this.db.insert(nucleos).values(input).returning()
    return row
  }

  list() {
    return this.db.select().from(nucleos)
  }

  /** Configuração do empório (fuso, etc.) — do núcleo do próprio usuário. */
  async getConfig(nucleoId: string) {
    const [n] = await this.db
      .select({
        nome: nucleos.nome,
        timezone: nucleos.timezone,
        corteDia: nucleos.corteDia,
        corteHora: nucleos.corteHora,
      })
      .from(nucleos)
      .where(eq(nucleos.id, nucleoId))
      .limit(1)
    if (!n) throw new NotFoundException('Núcleo não encontrado')
    return n
  }

  async updateConfig(nucleoId: string, input: NucleoConfigInput) {
    const [n] = await this.db
      .update(nucleos)
      .set({ timezone: input.timezone, corteDia: input.corteDia, corteHora: input.corteHora })
      .where(eq(nucleos.id, nucleoId))
      .returning({
        nome: nucleos.nome,
        timezone: nucleos.timezone,
        corteDia: nucleos.corteDia,
        corteHora: nucleos.corteHora,
      })
    if (!n) throw new NotFoundException('Núcleo não encontrado')
    return n
  }
}
