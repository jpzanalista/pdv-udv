import { z } from 'zod'
import { TIMEZONE_IDS } from './nucleo.js'

/** Login do Gestor da Plataforma (único; e-mail + senha do .env). */
export const gestorLoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})
export type GestorLoginInput = z.infer<typeof gestorLoginSchema>

/** Onboarding de um empório (núcleo + responsável + ASAAS opcional). */
export const onboardNucleoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do núcleo'),
  nomeExibicao: z.string().trim().max(160).optional(),
  udvId: z.number().int().positive().optional(),
  regionId: z.string().uuid().optional(),
  timezone: z.enum(TIMEZONE_IDS).optional(),
  responsavelEmail: z.string().email('E-mail do responsável inválido'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
    .optional(), // se presente → provisiona a subconta ASAAS
})
export type OnboardNucleoInput = z.infer<typeof onboardNucleoSchema>

/** Autorizar/suspender o uso do PDV por um núcleo. */
export const toggleNucleoSchema = z.object({ ativo: z.boolean() })
export type ToggleNucleoInput = z.infer<typeof toggleNucleoSchema>

/** Observação ("ver como"): papéis que o gestor pode assumir (somente leitura). */
export const IMPERSONAVEIS = ['responsavel_emporio', 'presidencia'] as const
export const impersonarSchema = z.object({
  nucleoId: z.string().uuid(),
  papel: z.enum(IMPERSONAVEIS),
})
export type ImpersonarInput = z.infer<typeof impersonarSchema>
