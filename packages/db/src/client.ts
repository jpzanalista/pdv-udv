import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient } from 'pg'
import * as schema from './schema.js'

export type Database = ReturnType<typeof createDb>

/** Conexão simples (usada pela API; o contexto de núcleo é setado por requisição). */
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}

/** Pool cru — a API gerencia o contexto de RLS por requisição. */
export function createPool(connectionString: string) {
  return new Pool({ connectionString })
}

export function dbFromPool(pool: Pool) {
  return drizzle(pool, { schema })
}

/** Drizzle preso a um client específico (com o contexto de núcleo já setado). */
export function dbFromClient(client: PoolClient) {
  return drizzle(client, { schema })
}

/**
 * Pool de administração para scripts/seed/migração: cada conexão nasce com
 * `app.bypass = on`, então enxerga/escreve em todos os núcleos (RLS desligado p/ manutenção).
 */
export function createAdminDb(connectionString: string) {
  const pool = new Pool({ connectionString })
  pool.on('connect', (client) => {
    client.query("SET app.bypass = 'on'").catch(() => {})
  })
  return drizzle(pool, { schema })
}
