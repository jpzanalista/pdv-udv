import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  type AtivarUsuarioInput,
  type CadastrarResponsavelInput,
  type JwtClaims,
  ativarUsuarioSchema,
  cadastrarResponsavelSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ResponsavelService } from './responsavel.service'

/** Gestão do responsável pelo presidente/representante do núcleo. */
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('presidencia', 'representante_nucleo', 'admin')
export class ResponsaveisController {
  constructor(private readonly responsavel: ResponsavelService) {}

  @Post('responsavel')
  cadastrar(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(cadastrarResponsavelSchema)) body: CadastrarResponsavelInput,
  ) {
    return this.responsavel.cadastrar(this.nucleo(user), body.email)
  }

  @Get('responsaveis')
  listar(@CurrentUser() user: JwtClaims) {
    return this.responsavel.listar(this.nucleo(user))
  }

  @Patch('responsavel/:id')
  ativar(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ativarUsuarioSchema)) body: AtivarUsuarioInput,
  ) {
    return this.responsavel.definirAtivo(this.nucleo(user), id, body.ativo)
  }

  private nucleo(user: JwtClaims): string {
    if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
    return user.nucleoId
  }
}
