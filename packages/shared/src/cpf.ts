import { z } from 'zod'

/** Valida CPF (11 dígitos + dígitos verificadores). Aceita só dígitos. */
export function cpfValido(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += Number(c[i]) * (10 - i)
  let d1 = 11 - (s % 11)
  if (d1 >= 10) d1 = 0
  if (d1 !== Number(c[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += Number(c[i]) * (11 - i)
  let d2 = 11 - (s % 11)
  if (d2 >= 10) d2 = 0
  return d2 === Number(c[10])
}

/** Sócio cadastra o próprio CPF no portal (destrava o Pix). */
export const meuCpfSchema = z.object({
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .refine(cpfValido, 'CPF inválido'),
})
export type MeuCpfInput = z.infer<typeof meuCpfSchema>
