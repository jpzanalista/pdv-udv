import { z } from 'zod'
import { MOVIMENTO_DESTINOS, MOVIMENTO_TIPOS } from './enums.js'

export const createMovimentoSchema = z
  .object({
    tipo: z.enum(MOVIMENTO_TIPOS),
    destino: z.enum(MOVIMENTO_DESTINOS).optional(),
    valorCents: z.number().int().positive(),
    descricao: z.string().max(255).optional(),
    recebedor: z.string().max(160).optional(),
  })
  .refine((d) => d.tipo !== 'sangria' || !!d.destino, {
    message: 'Sangria exige um destino',
    path: ['destino'],
  })
  .refine((d) => !(d.tipo === 'sangria' && d.destino === 'compra') || !!d.recebedor, {
    message: 'Compra exige informar o recebedor',
    path: ['recebedor'],
  })
export type CreateMovimentoInput = z.infer<typeof createMovimentoSchema>
