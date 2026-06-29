/**
 * Formata um ISO em data/hora local do empório. Sem `timezone`, usa o fuso do navegador
 * (retrocompatível). Com `timezone` (do /auth/me), respeita o fuso do núcleo.
 */
export function fmtDataHora(iso: string, timezone?: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
