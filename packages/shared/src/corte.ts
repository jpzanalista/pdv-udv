import { z } from 'zod'

/** Competência do corte: 'YYYY-MM'. */
export const competenciaSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Competência deve ser YYYY-MM')

/** Fechar o corte de uma competência. */
export const fecharCorteSchema = z.object({
  competencia: competenciaSchema,
})
export type FecharCorteInput = z.infer<typeof fecharCorteSchema>
