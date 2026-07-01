import { Global, Module } from '@nestjs/common'
import { type Database, createPool, dbFromPool } from '@pdv-udv/db'
import type { Pool } from 'pg'
import { tenantAls } from './tenant'

export const DB = Symbol('DB')
export const POOL = Symbol('POOL')

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      useFactory: () => {
        // A API conecta como papel de aplicação (sujeito a RLS). Enquanto DATABASE_URL_APP
        // não estiver setado, cai no DATABASE_URL (transição segura — RLS ainda não enforça).
        const url = process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL
        if (!url) throw new Error('DATABASE_URL(_APP) não definido')
        return createPool(url)
      },
    },
    {
      // Proxy: resolve para o `db` da requisição (com contexto de núcleo) quando houver;
      // caso contrário usa o `db` base (sem contexto → não vê linhas de núcleo — fail-closed).
      provide: DB,
      inject: [POOL],
      useFactory: (pool: Pool): Database => {
        const base = dbFromPool(pool)
        return new Proxy(base as object, {
          get(target, prop, receiver) {
            const active = (tenantAls.getStore()?.db ?? target) as object
            const value = Reflect.get(active, prop, receiver)
            return typeof value === 'function'
              ? (value as (...a: unknown[]) => unknown).bind(active)
              : value
          },
        }) as Database
      },
    },
  ],
  exports: [DB, POOL],
})
export class DbModule {}
