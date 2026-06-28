import { Body, Controller, Post } from '@nestjs/common'
import {
  type DefinirSenhaInput,
  type EmporioLoginInput,
  type ResetSenhaInput,
  definirSenhaSchema,
  emporioLoginSchema,
  resetSenhaSchema,
} from '@pdv-udv/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ResponsavelService } from './responsavel.service'

/** Auth própria do responsável do empório (e-mail + senha, sem Cognito). */
@Controller('auth/emporio')
export class EmporioAuthController {
  constructor(private readonly responsavel: ResponsavelService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(emporioLoginSchema)) body: EmporioLoginInput) {
    return this.responsavel.login(body.email, body.senha)
  }

  @Post('reset')
  reset(@Body(new ZodValidationPipe(resetSenhaSchema)) body: ResetSenhaInput) {
    return this.responsavel.solicitarReset(body.email)
  }

  @Post('definir-senha')
  definirSenha(@Body(new ZodValidationPipe(definirSenhaSchema)) body: DefinirSenhaInput) {
    return this.responsavel.definirSenha(body.token, body.senha)
  }
}
