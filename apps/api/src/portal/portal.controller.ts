import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  type JwtClaims,
  type MeuCpfInput,
  type QuitarContaInput,
  meuCpfSchema,
  quitarContaSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CobrancasService } from '../asaas/cobrancas.service'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { PortalService } from './portal.service'

@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('socio')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly cobrancas: CobrancasService,
  ) {}

  @Get('contas')
  contas(@CurrentUser() user: JwtClaims) {
    return this.portal.minhasContas(this.pessoa(user))
  }

  @Get('contas/:id/extrato')
  extrato(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.portal.extrato(this.pessoa(user), id)
  }

  /** Pix bloqueado durante o fechamento mensal? */
  @Get('fechamento')
  fechamento(@CurrentUser() user: JwtClaims) {
    return this.portal.statusFechamento(this.pessoa(user))
  }

  /** Dados do próprio sócio (nome + CPF). */
  @Get('perfil')
  perfil(@CurrentUser() user: JwtClaims) {
    return this.portal.perfil(this.pessoa(user))
  }

  /** Sócio cadastra o próprio CPF (destrava o Pix). */
  @Patch('meu-cpf')
  meuCpf(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(meuCpfSchema)) body: MeuCpfInput,
  ) {
    return this.portal.definirCpf(this.pessoa(user), body.cpf)
  }

  @Post('contas/:id/quitar')
  quitar(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(quitarContaSchema)) body: QuitarContaInput,
  ) {
    return this.cobrancas.quitar(this.pessoa(user), id, body.valorCents)
  }

  private pessoa(user: JwtClaims): string {
    if (!user.pessoaId) throw new ForbiddenException('Token sem pessoa')
    return user.pessoaId
  }
}
