import { type Database, nucleos } from '@pdv-udv/db'
import { eq } from 'drizzle-orm'

/**
 * Fuso horário para exibir datas/horas locais (recibo, filtros, relatórios).
 *
 * Fonte da verdade = coluna `nucleos.timezone` (editável pelo responsável).
 * `DEFAULT_TZ` é só o fallback global (env `APP_TIMEZONE` ou São Paulo).
 */
export const DEFAULT_TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo'

/** Fuso do núcleo (coluna `timezone`), com fallback p/ o default global. */
export async function timezoneDoNucleo(db: Database, nucleoId: string): Promise<string> {
  const [n] = await db
    .select({ tz: nucleos.timezone })
    .from(nucleos)
    .where(eq(nucleos.id, nucleoId))
    .limit(1)
  return n?.tz ?? DEFAULT_TZ
}
