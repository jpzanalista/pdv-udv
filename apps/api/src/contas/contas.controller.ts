import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  type CreateContaInput,
  type ImportContasInput,
  type JwtClaims,
  type RegistrarPagamentoInput,
  type UpdateContaInput,
  createContaSchema,
  importContasSchema,
  registrarPagamentoSchema,
  updateContaSchema,
} from '@pdv-udv/shared'
import { CobrancasService } from '../asaas/cobrancas.service'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ContasService } from './contas.service'

@Controller('contas')
@UseGuards(JwtAuthGuard)
export class ContasController {
  constructor(
    private readonly contas: ContasService,
    private readonly cobrancas: CobrancasService,
  ) {}

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

  // ⚠️ antes de @Get(':id') para 'visitantes' não cair na rota de id.
  @Get('visitantes')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  statusVisitantes(@CurrentUser() user: JwtClaims) {
    return this.cobrancas.statusVisitantes(this.requireNucleo(user))
  }

  @Post('cobrar-visitantes')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  cobrarVisitantes(@CurrentUser() user: JwtClaims) {
    return this.cobrancas.cobrarVisitantes(this.requireNucleo(user))
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  atualizar(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContaSchema)) body: UpdateContaInput,
  ) {
    return this.contas.atualizar(this.requireNucleo(user), id, body)
  }

  @Get(':id/extrato')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  extrato(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.contas.extrato(this.requireNucleo(user), id)
  }

  @Post(':id/pagamento')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  registrarPagamento(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(registrarPagamentoSchema)) body: RegistrarPagamentoInput,
  ) {
    return this.contas.registrarPagamento(this.requireNucleo(user), id, body)
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
