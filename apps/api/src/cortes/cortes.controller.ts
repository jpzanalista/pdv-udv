import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { type FecharCorteInput, type JwtClaims, fecharCorteSchema } from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { CortesService } from './cortes.service'

function nucleoOf(user: JwtClaims): string {
  if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
  return user.nucleoId
}

@Controller('cortes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('responsavel_emporio', 'admin')
export class CortesController {
  constructor(private readonly cortes: CortesService) {}

  /** Prévia do corte (competência opcional; default = a devida). Não grava. */
  @Get('previa')
  @Roles('responsavel_emporio', 'admin', 'tesoureiro_1', 'tesoureiro_2')
  previa(@CurrentUser() user: JwtClaims, @Query('competencia') competencia?: string) {
    return this.cortes.previa(nucleoOf(user), competencia || undefined)
  }

  /** Cortes já fechados. */
  @Get()
  @Roles('responsavel_emporio', 'admin', 'tesoureiro_1', 'tesoureiro_2')
  listar(@CurrentUser() user: JwtClaims) {
    return this.cortes.listar(nucleoOf(user))
  }

  /** Detalhe de um corte fechado (reimpressão). */
  @Get(':id')
  @Roles('responsavel_emporio', 'admin', 'tesoureiro_1', 'tesoureiro_2')
  detalhe(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.cortes.detalhe(nucleoOf(user), id)
  }

  /** Fecha o corte (snapshot + baixa). */
  @Post('fechar')
  fechar(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(fecharCorteSchema)) body: FecharCorteInput,
  ) {
    return this.cortes.fechar(nucleoOf(user), body.competencia, user.sub)
  }

  /** Contingência: roda agora os cortes devidos de todos os núcleos (o que o agendador faz). */
  @Post('agendados/executar')
  @Roles('admin')
  executarAgendados() {
    return this.cortes.fecharDevidosAutomatico()
  }
}
