import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  type AbrirExpedienteInput,
  type CreateMovimentoInput,
  type FecharExpedienteInput,
  type JwtClaims,
  abrirExpedienteSchema,
  createMovimentoSchema,
  fecharExpedienteSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
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

  @Get('movimentos')
  listarMovimentos(@CurrentUser() user: JwtClaims) {
    return this.expedientes.listarMovimentos(nucleoOf(user))
  }

  @Post('movimentos')
  criarMovimento(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(createMovimentoSchema)) body: CreateMovimentoInput,
  ) {
    return this.expedientes.criarMovimento(nucleoOf(user), user.sub, body)
  }

  // ⚠️ rotas estáticas ('historico', 'pendentes') antes de ':id'.
  @Get('movimentos/historico')
  @UseGuards(RolesGuard)
  @Roles('tesoureiro_1', 'tesoureiro_2', 'responsavel_emporio', 'presidencia', 'admin')
  historico(@CurrentUser() user: JwtClaims) {
    return this.expedientes.historicoMovimentos(nucleoOf(user))
  }

  @Get('movimentos/pendentes')
  @UseGuards(RolesGuard)
  @Roles('tesoureiro_1', 'tesoureiro_2', 'admin')
  pendentes(@CurrentUser() user: JwtClaims) {
    return this.expedientes.movimentosPendentes(nucleoOf(user))
  }

  @Post('movimentos/:id/validar')
  @UseGuards(RolesGuard)
  @Roles('tesoureiro_1', 'tesoureiro_2', 'admin')
  validar(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.expedientes.validarMovimento(nucleoOf(user), user.sub, id)
  }

  @Get('movimentos/:id')
  getMovimento(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.expedientes.getMovimento(nucleoOf(user), id)
  }
}
