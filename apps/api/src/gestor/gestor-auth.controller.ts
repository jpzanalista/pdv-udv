import { Body, Controller, Post } from '@nestjs/common'
import { type GestorLoginInput, gestorLoginSchema } from '@pdv-udv/shared'
import { RateLimit } from '../common/rate-limit.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { GestorService } from './gestor.service'

/** Login do Gestor da Plataforma (único; credenciais no .env). */
@Controller('auth')
export class GestorAuthController {
  constructor(private readonly gestor: GestorService) {}

  @Post('gestor')
  @RateLimit(10)
  login(@Body(new ZodValidationPipe(gestorLoginSchema)) body: GestorLoginInput) {
    return this.gestor.login(body.email, body.senha)
  }
}
