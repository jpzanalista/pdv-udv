import { Body, Controller, Post } from '@nestjs/common'
import { type LoginInput, loginSchema } from '@pdv-udv/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.loginStaff(body)
  }
}
