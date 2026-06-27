import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import {
  type AbrirExpedienteInput,
  type FecharExpedienteInput,
  type JwtClaims,
  abrirExpedienteSchema,
  fecharExpedienteSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ExpedientesService } from './expedientes.service'

function nucleoOf(user: JwtClaims): string {
  if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
  return user.nucleoId
}

@Controller('expedientes')
@UseGuards(JwtAuthGuard)
export class ExpedientesController {
  constructor(private readonly expedientes: ExpedientesService) {}

  @Get('atual')
  atual(@CurrentUser() user: JwtClaims) {
    return this.expedientes.atual(nucleoOf(user))
  }

  @Post('abrir')
  abrir(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(abrirExpedienteSchema)) body: AbrirExpedienteInput,
  ) {
    return this.expedientes.abrir(nucleoOf(user), user.sub, body.fundoTrocoCents)
  }

  @Post('fechar')
  fechar(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(fecharExpedienteSchema)) body: FecharExpedienteInput,
  ) {
    return this.expedientes.fechar(nucleoOf(user), body.valorContadoCents)
  }
}
