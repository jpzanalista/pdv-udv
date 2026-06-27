import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { type CreateVendaInput, type JwtClaims, createVendaSchema } from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { VendasService } from './vendas.service'

function nucleoOf(user: JwtClaims): string {
  if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
  return user.nucleoId
}

@Controller('vendas')
@UseGuards(JwtAuthGuard)
export class VendasController {
  constructor(private readonly vendas: VendasService) {}

  @Post()
  create(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(createVendaSchema)) body: CreateVendaInput,
  ) {
    return this.vendas.create(nucleoOf(user), user.sub, body)
  }

  @Get()
  list(@CurrentUser() user: JwtClaims) {
    return this.vendas.list(nucleoOf(user))
  }
}
