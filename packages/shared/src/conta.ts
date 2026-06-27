import { z } from 'zod'
import { ACCOUNT_TYPES } from './enums.js'

export const createContaSchema = z.object({
  tipo: z.enum(ACCOUNT_TYPES),
  nome: z.string().min(1).max(160),
  titularPessoaId: z.string().uuid().optional(),
  membros: z.array(z.string().uuid()).optional(),
  descontoPct: z.number().min(0).max(100).optional(),
})
export type CreateContaInput = z.infer<typeof createContaSchema>

/** Linha de import de conta/cliente (vinda de Excel — ex.: TaurusPOS). */
export const contaImportSchema = z.object({
  nome: z.string().min(1).max(160),
  tipo: z.enum(ACCOUNT_TYPES).optional(),
  cpf: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  descontoPct: z.number().min(0).max(100).optional(),
})
export type ContaImportRow = z.infer<typeof contaImportSchema>

export const importContasSchema = z.object({
  contas: z.array(contaImportSchema).min(1).max(10000),
})
export type ImportContasInput = z.infer<typeof importContasSchema>
