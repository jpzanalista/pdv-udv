import { z } from 'zod'

export const createNucleoSchema = z.object({
  nome: z.string().min(1).max(160),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos'),
  regiao: z.string().max(120).optional(),
})
export type CreateNucleoInput = z.infer<typeof createNucleoSchema>
