export type Categoria = { id: string; nome: string; ordem: number }

export type Produto = {
  id: string
  descricao: string
  precoVenda: string
  precoCusto: string
  categoriaId: string | null
  codigoBarras: string | null
  ativo: boolean
  exibirVenda: boolean
}

export type Conta = { id: string; nome: string; tipo: string }

/** Item do carrinho — unitário em centavos. */
export type CartItem = { produtoId: string; descricao: string; qtde: number; unitario: number }

export type Ident = { kind: 'socio'; conta: Conta } | { kind: 'visitante' } | null
