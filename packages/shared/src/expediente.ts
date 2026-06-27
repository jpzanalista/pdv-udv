import { z } from 'zod'

export const abrirExpedienteSchema = z.object({
  fundoTrocoCents: z.number().int().min(0),
})
export type AbrirExpedienteInput = z.infer<typeof abrirExpedienteSchema>

export const fecharExpedienteSchema = z.object({
  valorContadoCents: z.number().int().min(0),
})
export type FecharExpedienteInput = z.infer<typeof fecharExpedienteSchema>
