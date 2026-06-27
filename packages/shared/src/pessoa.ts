import { z } from 'zod'

export const createPessoaSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  nome: z.string().min(1).max(160),
  whatsapp: z.string().max(20).optional(),
  email: z.string().email().optional(),
  reuniId: z.string().max(80).optional(),
  nascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD')
    .optional(),
})
export type CreatePessoaInput = z.infer<typeof createPessoaSchema>
