import { z } from 'zod'
import { ROLES } from './enums.js'

/** Login de staff: credenciais vão à nossa API, que faz o USER_SRP_AUTH no Cognito. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

/** Login de desenvolvimento (NODE_ENV != production) — entra por e-mail de usuário semeado. */
export const devLoginSchema = z.object({
  email: z.string().email(),
})
export type DevLoginInput = z.infer<typeof devLoginSchema>

/** Sócio: solicita OTP pelo número do WhatsApp (o código chega no próprio WhatsApp). */
export const otpRequestSchema = z.object({
  whatsapp: z.string().min(8).max(20),
})
export type OtpRequestInput = z.infer<typeof otpRequestSchema>

export const otpVerifySchema = z.object({
  whatsapp: z.string().min(8).max(20),
  code: z.string().regex(/^\d{4,6}$/),
})
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>

/** Conteúdo do NOSSO JWT (token exchange). */
export const jwtClaimsSchema = z.object({
  sub: z.string(), // uuid do usuário, ou sentinela do gestor da plataforma
  nucleoId: z.string().uuid().nullable(),
  role: z.enum(ROLES),
  // Só no token do sócio (portal): aponta para a pessoa dona da conta.
  pessoaId: z.string().uuid().nullish(),
  // Token de observação do gestor (impersonation): somente leitura.
  imp: z.boolean().nullish(),
})
export type JwtClaims = z.infer<typeof jwtClaimsSchema>

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})
export type TokenPair = z.infer<typeof tokenPairSchema>
