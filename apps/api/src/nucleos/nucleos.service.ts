import { Inject, Injectable } from '@nestjs/common'
import { type Database, nucleos } from '@pdv-udv/db'
import type { CreateNucleoInput } from '@pdv-udv/shared'
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
}
