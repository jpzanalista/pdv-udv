export type Categoria = { id: string; nome: string; ordem: number }

export type Produto = {
  id: string
  codigo: string | null
  descricao: string
  precoVenda: string
  precoCusto: string
  estoqueAtual: string
  estoqueMinimo: string
  controlaEstoque: boolean
  categoriaId: string | null
  codigoBarras: string | null
  ativo: boolean
  exibirVenda: boolean
}

export type Conta = { id: string; nome: string; tipo: string }

export type ExtratoMovimento = {
  id: string
  data: string
  tipo: 'debito' | 'credito'
  valorCents: number
  descricao: string | null
  venda: { numero: number | null; itens: { descricao: string; qtde: number; totalCents: number }[] } | null
}

export type ContaExtrato = {
  conta: { id: string; nome: string; tipo: string }
  saldoCents: number
  movimentos: ExtratoMovimento[]
}

/** Conta enriquecida com titular (para a página de gestão/exportação). */
export type ContaRow = {
  id: string
  nome: string
  tipo: string
  descontoPct: string
  ativa: boolean
  createdAt: string
  titularNome: string | null
  titularCpf: string | null
  titularWhatsapp: string | null
}

/** Item do carrinho — unitário em centavos. */
export type CartItem = { produtoId: string; descricao: string; qtde: number; unitario: number }

export type Ident = { kind: 'socio'; conta: Conta } | { kind: 'visitante' } | null

export type Expediente = {
  id: string
  fundoTroco: string
  abertoEm: string
  esperadoCents: number
}
