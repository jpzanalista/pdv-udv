import type { Role } from './enums.js'

/**
 * Mapa cargo REUNI (`role_new_id`, vem em `custom:cargos` no id_token) → papel do app.
 * Cargo não mapeado = SEM acesso ao empório (403 fail-fast).
 * Confirmado via repo de referência (cargoEscopo.ts) + estrutura UDV.
 */
export const CARGO_TO_ROLE: Record<number, Role> = {
  49: 'presidencia', // Presidente Local
  47: 'representante_nucleo', // Mestre Representante
  48: 'representante_nucleo', // Responsável pela DAV (= Mestre Representante, p/ DAVs em início)
  // TODO(tesoureiro): preencher role_new_id do 1º e 2º Tesoureiro Local quando o
  // responsável retornar (1-2 dias) → 'tesoureiro_1' / 'tesoureiro_2'.
  // Secretário: intencionalmente FORA do mapa → bloqueado (403).
}

/** Prioridade quando a pessoa tem múltiplos cargos (escolhe o de maior peso). */
const ROLE_RANK: Partial<Record<Role, number>> = {
  presidencia: 4,
  representante_nucleo: 3,
  tesoureiro_1: 2,
  tesoureiro_2: 2,
}

/** Faz o parse do CSV de cargos (`"52,62"`) em números. */
export function parseCargos(csv: string | undefined | null): number[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map((v) => Number(v))
    .filter((v) => !Number.isNaN(v))
}

/** Escolhe o melhor papel a partir dos cargos REUNI. null = nenhum cargo dá acesso. */
export function pickBestRole(cargos: number[]): Role | null {
  let best: Role | null = null
  let bestRank = -1
  for (const c of cargos) {
    const role = CARGO_TO_ROLE[c]
    if (!role) continue
    const rank = ROLE_RANK[role] ?? 1
    if (rank > bestRank) {
      best = role
      bestRank = rank
    }
  }
  return best
}
