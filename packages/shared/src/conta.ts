import { z } from 'zod'
import { ACCOUNT_TYPES } from './enums.js'

export const createContaSchema = z
  .object({
    tipo: z.enum(ACCOUNT_TYPES),
    nome: z.string().min(1).max(160),
    titularPessoaId: z.string().uuid().optional(),
    membros: z.array(z.string().uuid()).optional(),
    descontoPct: z.number().min(0).max(100).optional(),
    ativa: z.boolean().optional(),
    cpf: z.string().max(20).optional(),
    whatsapp: z.string().max(20).optional(),
  })
  // Visitante recebe o link de pagamento (Pix/ASAAS) por WhatsApp → obrigatório.
  .refine((d) => d.tipo !== 'visitante' || !!d.whatsapp?.trim(), {
    message: 'Visitante exige WhatsApp',
    path: ['whatsapp'],
  })
export type CreateContaInput = z.infer<typeof createContaSchema>

/** Atualização parcial de conta (edição manual). */
export const updateContaSchema = z
  .object({
    nome: z.string().min(1).max(160).optional(),
    tipo: z.enum(ACCOUNT_TYPES).optional(),
    descontoPct: z.number().min(0).max(100).optional(),
    ativa: z.boolean().optional(),
    cpf: z.string().max(20).optional(),
    whatsapp: z.string().max(20).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada para atualizar' })
export type UpdateContaInput = z.infer<typeof updateContaSchema>

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
