import { z } from 'zod'

export const createCategoriaSchema = z.object({
  nome: z.string().min(1).max(120),
  ordem: z.number().int().min(0).optional(),
})
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>

export const updateCategoriaSchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    ordem: z.number().int().min(0).optional(),
  })
  .refine((d) => d.nome !== undefined || d.ordem !== undefined, { message: 'Nada para atualizar' })
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>

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

/** Atualização parcial de produto (toggles e edição completa). */
export const updateProdutoSchema = z
  .object({
    codigo: z.string().max(40).nullish(),
    codigoBarras: z.string().max(40).nullish(),
    descricao: z.string().min(1).max(160).optional(),
    categoriaId: z.string().uuid().nullish(),
    precoVenda: z.number().min(0).optional(),
    precoCusto: z.number().min(0).optional(),
    estoqueAtual: z.number().optional(),
    controlaEstoque: z.boolean().optional(),
    ativo: z.boolean().optional(),
    exibirVenda: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada para atualizar' })
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>

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
