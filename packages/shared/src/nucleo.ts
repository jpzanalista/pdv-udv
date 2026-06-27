import { z } from 'zod'
import { NUCLEO_TYPES } from './enums.js'

export const createNucleoSchema = z.object({
  nome: z.string().min(1).max(160),
  type: z.enum(NUCLEO_TYPES).default('nucleo'),
  regionId: z.string().uuid().optional(),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
    .optional(),
  presEmail: z.string().email().optional(),
  represEmail: z.string().email().optional(),
  tesEmail: z.string().email().optional(),
  secEmail: z.string().email().optional(),
})
export type CreateNucleoInput = z.infer<typeof createNucleoSchema>
