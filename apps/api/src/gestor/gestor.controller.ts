import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  type ImpersonarInput,
  type OnboardNucleoInput,
  type ToggleNucleoInput,
  impersonarSchema,
  onboardNucleoSchema,
  toggleNucleoSchema,
} from '@pdv-udv/shared'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { GestorService } from './gestor.service'

/** Área da plataforma — só o gestor. Sem escopo de núcleo (vê todos). */
@Controller('gestor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('gestor_plataforma')
export class GestorController {
  constructor(private readonly gestor: GestorService) {}

  @Get('nucleos')
  listar() {
    return this.gestor.listarNucleos()
  }

  @Post('nucleos')
  onboard(@Body(new ZodValidationPipe(onboardNucleoSchema)) body: OnboardNucleoInput) {
    return this.gestor.onboard(body)
  }

  @Patch('nucleos/:id')
  toggle(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(toggleNucleoSchema)) body: ToggleNucleoInput,
  ) {
    return this.gestor.definirAtivo(id, body.ativo)
  }

  /** "Ver como" — token de observação (somente leitura) de um núcleo/papel. */
  @Post('impersonar')
  impersonar(@Body(new ZodValidationPipe(impersonarSchema)) body: ImpersonarInput) {
    return this.gestor.impersonar(body.nucleoId, body.papel)
  }
}
