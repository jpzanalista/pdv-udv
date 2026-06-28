import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { JwtClaims } from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { RelatoriosService } from './relatorios.service'

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('vendas')
  @Roles('responsavel_emporio', 'presidencia', 'representante_nucleo', 'admin')
  vendas(@CurrentUser() user: JwtClaims, @Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.vendas(this.nucleo(user), de, ate)
  }

  @Get('financeiro')
  @Roles('responsavel_emporio', 'presidencia', 'representante_nucleo', 'tesoureiro_1', 'tesoureiro_2', 'admin')
  financeiro(@CurrentUser() user: JwtClaims, @Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.financeiro(this.nucleo(user), de, ate)
  }

  private nucleo(user: JwtClaims): string {
    if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
    return user.nucleoId
  }
}
