import { z } from 'zod'

export const createCategoriaSchema = z.object({
  nome: z.string().min(1).max(120),
  ordem: z.number().int().min(0).optional(),
})
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>

export const createProdutoSchema = z.object({
  descricao: z.string().min(1).max(160),
  categoriaId: z.string().uuid().optional(),
  codigo: z.string().max(40).optional(),
  codigoBarras: z.string().max(40).optional(),
  precoVenda: z.number().min(0),
  precoCusto: z.number().min(0).optional(),
  controlaEstoque: z.boolean().optional(),
  estoqueAtual: z.number().optional(),
  ativo: z.boolean().optional(),
  exibirVenda: z.boolean().optional(),
})
export type CreateProdutoInput = z.infer<typeof createProdutoSchema>
