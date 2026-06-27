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
