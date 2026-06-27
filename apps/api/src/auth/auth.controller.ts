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

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.loginStaff(body)
  }

  /** Apenas fora de produção (ver ../AUTH.md / dev). */
  @Post('dev-login')
  devLogin(@Body(new ZodValidationPipe(devLoginSchema)) body: DevLoginInput) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('dev-login desabilitado em produção')
    }
    return this.auth.devLogin(body.email)
  }
}
