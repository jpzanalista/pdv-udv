import { z } from 'zod'
import { PAYMENT_METHODS, PERSON_KINDS } from './enums.js'

// Valores monetários trafegam em CENTAVOS (inteiros) — sem float na borda.
const vendaItemSchema = z.object({
  produtoId: z.string().uuid(),
  descricao: z.string().min(1).max(160),
  qtde: z.number().positive(),
  unitarioCents: z.number().int().min(0),
})

const pagamentoSchema = z.object({
  metodo: z.enum(PAYMENT_METHODS),
  valorCents: z.number().int().min(0),
})

export const createVendaSchema = z.object({
  personKind: z.enum(PERSON_KINDS).optional(),
  pessoaId: z.string().uuid().optional(),
  contaId: z.string().uuid().optional(),
  descontoCents: z.number().int().min(0).optional(),
  itens: z.array(vendaItemSchema).min(1),
  pagamentos: z.array(pagamentoSchema).min(1),
})
export type CreateVendaInput = z.infer<typeof createVendaSchema>

/** Devolução parcial: itens (e quantidades) a devolver de uma venda. */
export const devolverVendaSchema = z.object({
  itens: z.array(z.object({ vendaItemId: z.string().uuid(), qtde: z.number().positive() })).min(1),
  motivo: z.string().max(200).optional(),
})
export type DevolverVendaInput = z.infer<typeof devolverVendaSchema>
