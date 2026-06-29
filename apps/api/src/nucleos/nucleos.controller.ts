import { BadRequestException, Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import {
  type CreateNucleoInput,
  type JwtClaims,
  type NucleoConfigInput,
  createNucleoSchema,
  nucleoConfigSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { NucleosService } from './nucleos.service'

function nucleoOf(user: JwtClaims): string {
  if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
  return user.nucleoId
}

@Controller('nucleos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class NucleosController {
  constructor(private readonly nucleos: NucleosService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createNucleoSchema)) body: CreateNucleoInput) {
    return this.nucleos.create(body)
  }

  @Get()
  list() {
    return this.nucleos.list()
  }

  /** Configuração do empório do próprio usuário (responsável ou admin). */
  @Get('config')
  @Roles('responsavel_emporio', 'admin')
  getConfig(@CurrentUser() user: JwtClaims) {
    return this.nucleos.getConfig(nucleoOf(user))
  }

  @Patch('config')
  @Roles('responsavel_emporio', 'admin')
  updateConfig(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(nucleoConfigSchema)) body: NucleoConfigInput,
  ) {
    return this.nucleos.updateConfig(nucleoOf(user), body)
  }
}
