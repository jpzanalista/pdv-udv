import { AsyncLocalStorage } from 'node:async_hooks'
import { type Database, dbFromClient } from '@pdv-udv/db'
import type { Pool } from 'pg'

type Store = { db: Database }

/** Guarda, por requisição, o `db` preso a uma conexão com o contexto de núcleo setado. */
export const tenantAls = new AsyncLocalStorage<Store>()

/**
 * Executa `fn` numa conexão dedicada com o contexto de RLS:
 * - `nucleoId`: só enxerga/escreve linhas daquele núcleo.
 * - `bypass`: enxerga todos (gestor da plataforma, webhook, agendador).
 * Sem contexto, o `db` base não vê nenhuma linha de núcleo (fail-closed).
 */
export async function runInContext<T>(
  pool: Pool,
  ctx: { nucleoId?: string | null; bypass?: boolean },
  fn: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    if (ctx.bypass) {
      await client.query("SET app.bypass = 'on'")
    } else {
      await client.query("SELECT set_config('app.nucleo_id', $1, false)", [ctx.nucleoId ?? ''])
    }
    // Mesmo shape do Database (só muda $client: PoolClient vs Pool) — usamos só o query-builder.
    const db = dbFromClient(client) as unknown as Database
    return await tenantAls.run({ db }, fn)
  } finally {
    await client.query('RESET ALL').catch(() => {})
    client.release()
  }
}
