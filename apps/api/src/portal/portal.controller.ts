import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common'
import type { JwtClaims } from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { PortalService } from './portal.service'

@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('socio')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('contas')
  contas(@CurrentUser() user: JwtClaims) {
    return this.portal.minhasContas(this.pessoa(user))
  }

  @Get('contas/:id/extrato')
  extrato(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.portal.extrato(this.pessoa(user), id)
  }

  private pessoa(user: JwtClaims): string {
    if (!user.pessoaId) throw new ForbiddenException('Token sem pessoa')
    return user.pessoaId
  }
}
