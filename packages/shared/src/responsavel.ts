import { z } from 'zod'

/** Login do responsável do empório (e-mail + senha, auth própria). */
export const emporioLoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})
export type EmporioLoginInput = z.infer<typeof emporioLoginSchema>

/** Solicitar redefinição de senha. */
export const resetSenhaSchema = z.object({
  email: z.string().email(),
})
export type ResetSenhaInput = z.infer<typeof resetSenhaSchema>

/** Definir/redefinir senha a partir do token recebido por e-mail. */
export const definirSenhaSchema = z.object({
  token: z.string().min(10),
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
})
export type DefinirSenhaInput = z.infer<typeof definirSenhaSchema>

/** Presidente/representante cadastra um responsável (por e-mail). */
export const cadastrarResponsavelSchema = z.object({
  email: z.string().email(),
})
export type CadastrarResponsavelInput = z.infer<typeof cadastrarResponsavelSchema>

export const ativarUsuarioSchema = z.object({
  ativo: z.boolean(),
})
export type AtivarUsuarioInput = z.infer<typeof ativarUsuarioSchema>
