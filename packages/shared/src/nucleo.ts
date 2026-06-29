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

/** Fusos do Brasil (todos os offsets). `id` IANA + rótulo amigável p/ o seletor. */
export const BR_TIMEZONES = [
  { id: 'America/Sao_Paulo', label: 'Brasília (UTC−3) — SP, RJ, Sul, NE, Centro' },
  { id: 'America/Campo_Grande', label: 'Campo Grande (UTC−4) — MS' },
  { id: 'America/Cuiaba', label: 'Cuiabá (UTC−4) — MT' },
  { id: 'America/Porto_Velho', label: 'Porto Velho (UTC−4) — RO' },
  { id: 'America/Boa_Vista', label: 'Boa Vista (UTC−4) — RR' },
  { id: 'America/Manaus', label: 'Manaus (UTC−4) — AM' },
  { id: 'America/Rio_Branco', label: 'Rio Branco (UTC−5) — AC' },
  { id: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
] as const

export const TIMEZONE_IDS = BR_TIMEZONES.map((t) => t.id) as [string, ...string[]]
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

/** Configuração do empório editável pelo responsável. */
export const nucleoConfigSchema = z.object({
  timezone: z.enum(TIMEZONE_IDS),
  // Corte mensal do crediário: dia (1–28, seguro p/ todo mês) + hora HH:MM no fuso do núcleo.
  corteDia: z.number().int().min(1).max(28),
  corteHora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'),
})
export type NucleoConfigInput = z.infer<typeof nucleoConfigSchema>
