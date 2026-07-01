import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { CobrancasService } from './cobrancas.service'

@Controller('asaas')
export class AsaasController {
  constructor(private readonly cobrancas: CobrancasService) {}

  /** Admin provisiona a subconta ASAAS de um núcleo. */
  @Post('nucleos/:id/subconta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  provisionar(@Param('id') id: string) {
    return this.cobrancas.provisionarSubconta(id)
  }

  /** Webhook do ASAAS → baixa idempotente. Público, validado por token. */
  @Post('webhook')
  async webhook(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: { event?: string; payment?: { id?: string } },
  ) {
    // Fail-closed: sem token configurado (ou divergente) → rejeita.
    const esperado = process.env.ASAAS_WEBHOOK_TOKEN
    if (!esperado || token !== esperado) throw new UnauthorizedException('token inválido')

    const paymentId = body?.payment?.id
    if (paymentId && (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED')) {
      await this.cobrancas.baixaPorPagamento(paymentId)
    }
    return { received: true }
  }

  /** DEV: simula um pagamento confirmado (testar a baixa sem ASAAS real). */
  @Post('simular/:paymentId')
  simular(@Param('paymentId') paymentId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('simulação desabilitada em produção')
    }
    return this.cobrancas.baixaPorPagamento(paymentId)
  }
}
