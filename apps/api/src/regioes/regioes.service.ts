import { Inject, Injectable } from '@nestjs/common'
import { type Database, regioes } from '@pdv-udv/db'
import { asc } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class RegioesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  list() {
    return this.db.select().from(regioes).orderBy(asc(regioes.udvId))
  }
}
