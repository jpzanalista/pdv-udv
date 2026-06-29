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

/** Offset (ms) tal que: horário local = UTC + offset, para `tz` no instante `date`. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUTC - date.getTime()
}

/** Instante UTC de um horário de parede (ano/mês/dia hh:mm) num fuso. (Brasil sem DST → exato.) */
export function instanteLocal(
  year: number,
  month0: number,
  day: number,
  hh: number,
  mm: number,
  tz: string,
): Date {
  const guess = Date.UTC(year, month0, day, hh, mm, 0)
  return new Date(guess - tzOffsetMs(new Date(guess), tz))
}

/** Componentes ano/mês(1-12) locais de uma data num fuso. */
export function anoMesLocal(date: Date, tz: string): { ano: number; mes: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value
  return { ano: +p.year, mes: +p.month }
}
