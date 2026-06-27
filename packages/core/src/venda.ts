import type { Cents } from './money.js'

export interface ItemCarrinho {
  produtoId: string
  descricao: string
  qtde: number
  unitario: Cents
}

export interface TotaisVenda {
  subtotal: Cents
  desconto: Cents
  total: Cents
}

/** Total da venda = soma(qtde × unitário) − desconto. Regra compartilhada web (offline) + api. */
export function calcularTotais(itens: ItemCarrinho[], desconto: Cents = 0): TotaisVenda {
  const subtotal = itens.reduce((acc, i) => acc + Math.round(i.qtde * i.unitario), 0)
  const total = Math.max(0, subtotal - desconto)
  return { subtotal, desconto, total }
}

/** Saldo da conta = soma de débitos − soma de créditos (lançamentos append-only). */
export function calcularSaldo(lancamentos: { tipo: 'debito' | 'credito'; valor: Cents }[]): Cents {
  return lancamentos.reduce(
    (acc, l) => acc + (l.tipo === 'debito' ? l.valor : -l.valor),
    0,
  )
}
