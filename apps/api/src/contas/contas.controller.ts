import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import {
  type CreateContaInput,
  type ImportContasInput,
  type JwtClaims,
  createContaSchema,
  importContasSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ContasService } from './contas.service'

@Controller('contas')
@UseGuards(JwtAuthGuard)
export class ContasController {
  constructor(private readonly contas: ContasService) {}

  @Post()
  create(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(createContaSchema)) body: CreateContaInput,
  ) {
    return this.contas.create(this.requireNucleo(user), body)
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  importar(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(importContasSchema)) body: ImportContasInput,
  ) {
    return this.contas.importar(this.requireNucleo(user), body)
  }

  @Get()
  list(@CurrentUser() user: JwtClaims) {
    return this.contas.list(this.requireNucleo(user))
  }

  @Get(':id')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.contas.get(this.requireNucleo(user), id)
  }

  private requireNucleo(user: JwtClaims): string {
    if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
    return user.nucleoId
  }
}
