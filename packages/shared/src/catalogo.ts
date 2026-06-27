import { z } from 'zod'

export const createCategoriaSchema = z.object({
  nome: z.string().min(1).max(120),
  ordem: z.number().int().min(0).optional(),
})
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>

/** Linha de import de produto (vinda de Excel — grupo = nome da categoria). */
export const produtoImportSchema = z.object({
  codigo: z.string().max(40).optional(),
  codigoBarras: z.string().max(40).optional(),
  descricao: z.string().min(1).max(160),
  grupo: z.string().max(120).optional(),
  precoVenda: z.number().min(0),
  precoCusto: z.number().min(0).optional(),
  estoqueAtual: z.number().optional(),
  controlaEstoque: z.boolean().optional(),
  ativo: z.boolean().optional(),
  exibirVenda: z.boolean().optional(),
})
export type ProdutoImportRow = z.infer<typeof produtoImportSchema>

export const importProdutosSchema = z.object({
  produtos: z.array(produtoImportSchema).min(1).max(5000),
})
export type ImportProdutosInput = z.infer<typeof importProdutosSchema>

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
