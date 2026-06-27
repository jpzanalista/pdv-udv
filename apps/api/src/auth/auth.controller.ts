import { Body, Controller, ForbiddenException, Post } from '@nestjs/common'
import {
  type DevLoginInput,
  type LoginInput,
  devLoginSchema,
  loginSchema,
} from '@pdv-udv/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login real: SRP no backend → nosso JWT. */
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.loginStaff(body)
  }

  /** DEV: faz o SRP e devolve os cargos/núcleo lidos do token (sem barrar por papel). */
  @Post('srp-debug')
  srpDebug(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('srp-debug desabilitado em produção')
    }
    return this.auth.srpDebug(body)
  }

  /** DEV: login por e-mail de usuário semeado (sem Cognito). */
  @Post('dev-login')
  devLogin(@Body(new ZodValidationPipe(devLoginSchema)) body: DevLoginInput) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('dev-login desabilitado em produção')
    }
    return this.auth.devLogin(body.email)
  }
}
