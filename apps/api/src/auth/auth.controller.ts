import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common'
import {
  type DevLoginInput,
  type JwtClaims,
  type LoginInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  devLoginSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
} from '@pdv-udv/shared'
import { RateLimit } from '../common/rate-limit.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'
import { OtpService } from './otp.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  /** Sócio: solicita o código OTP por WhatsApp a partir do CPF. */
  @Post('socio/otp')
  @RateLimit(5)
  solicitarOtp(@Body(new ZodValidationPipe(otpRequestSchema)) body: OtpRequestInput) {
    return this.otp.request(body.whatsapp)
  }

  /** Sócio: verifica o código e devolve o JWT (role=socio). */
  @Post('socio/verify')
  @RateLimit(10)
  verificarOtp(@Body(new ZodValidationPipe(otpVerifySchema)) body: OtpVerifyInput) {
    return this.otp.verify(body.whatsapp, body.code)
  }

  /** Quem sou eu? (a partir do nosso JWT) */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtClaims) {
    return this.auth.me(user)
  }

  /** Login real: SRP no backend → nosso JWT. */
  @Post('login')
  @RateLimit(10)
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
