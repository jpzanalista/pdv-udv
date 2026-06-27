/**
 * Dinheiro em centavos (inteiro) para evitar erro de ponto flutuante.
 * O banco guarda numeric(12,2); convertemos na borda.
 */
export type Cents = number

export function reaisToCents(reais: number): Cents {
  return Math.round(reais * 100)
}

export function centsToReais(cents: Cents): number {
  return cents / 100
}

export function formatBRL(cents: Cents): string {
  return centsToReais(cents).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
