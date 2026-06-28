import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, asaasCustomers, cobrancas, contas, lancamentos, nucleos, pessoas } from '@pdv-udv/db'
import { and, eq } from 'drizzle-orm'
import { DB } from '../db/db.module'
import { AsaasService } from './asaas.service'

const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)
const toReais = (cents: number) => (cents / 100).toFixed(2)

@Injectable()
export class CobrancasService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly asaas: AsaasService,
  ) {}

  /** Provisiona (idempotente) a subconta ASAAS do núcleo. */
  async provisionarSubconta(nucleoId: string) {
    const [nucleo] = await this.db.select().from(nucleos).where(eq(nucleos.id, nucleoId)).limit(1)
    if (!nucleo) throw new NotFoundException('Núcleo não encontrado')
    if (nucleo.asaasApiKey) {
      return { jaProvisionada: true, walletId: nucleo.asaasWalletId }
    }
    const sub = await this.asaas.provisionarSubconta(nucleo)
    await this.db
      .update(nucleos)
      .set({ asaasApiKey: sub.apiKey, asaasWalletId: sub.walletId })
      .where(eq(nucleos.id, nucleoId))
    return { jaProvisionada: false, walletId: sub.walletId }
  }

  /** Sócio gera o Pix para quitar (parte ou tudo) a própria conta. */
  async quitar(pessoaId: string, contaId: string, valorCents?: number) {
    const [conta] = await this.db
      .select({ id: contas.id, nucleoId: contas.nucleoId, nome: contas.nome, titular: contas.titularPessoaId })
      .from(contas)
      .where(eq(contas.id, contaId))
      .limit(1)
    if (!conta || conta.titular !== pessoaId) throw new ForbiddenException('Conta não pertence a você')

    const saldoCents = await this.saldo(contaId)
    const valor = valorCents ?? saldoCents
    if (valor <= 0) throw new BadRequestException('Nada a quitar')
    if (valor > saldoCents) throw new BadRequestException('Valor maior que o saldo em aberto')

    const [nucleo] = await this.db.select().from(nucleos).where(eq(nucleos.id, conta.nucleoId)).limit(1)
    let apiKey = nucleo?.asaasApiKey ?? null
    if (!apiKey) {
      if (!this.asaas.isStub) throw new BadRequestException('Subconta ASAAS do núcleo não provisionada')
      apiKey = 'stub'
    }

    const [pessoa] = await this.db.select().from(pessoas).where(eq(pessoas.id, pessoaId)).limit(1)
    const customerId = await this.ensureCustomer(apiKey, pessoa, conta.nucleoId)
    const pix = await this.asaas.criarPix(apiKey, customerId, valor, `Quitação ${conta.nome}`)

    await this.db.insert(cobrancas).values({
      nucleoId: conta.nucleoId,
      contaId,
      asaasPaymentId: pix.paymentId,
      valor: toReais(valor),
      status: 'pendente',
      invoiceUrl: pix.invoiceUrl,
    })

    return {
      paymentId: pix.paymentId,
      copiaECola: pix.copiaECola,
      qrImage: pix.qrImage,
      invoiceUrl: pix.invoiceUrl,
      valorCents: valor,
    }
  }

  /** Baixa idempotente acionada pelo webhook (ou pela simulação em dev). */
  async baixaPorPagamento(asaasPaymentId: string) {
    const [cob] = await this.db
      .select()
      .from(cobrancas)
      .where(eq(cobrancas.asaasPaymentId, asaasPaymentId))
      .limit(1)
    if (!cob) return { ok: false, motivo: 'cobranca-desconhecida' as const }
    if (cob.status === 'confirmada') return { ok: true, jaProcessado: true }

    await this.db.update(cobrancas).set({ status: 'confirmada' }).where(eq(cobrancas.id, cob.id))
    if (cob.contaId) {
      await this.db.insert(lancamentos).values({
        nucleoId: cob.nucleoId,
        contaId: cob.contaId,
        tipo: 'credito',
        valor: cob.valor,
        cobrancaId: cob.id,
        descricao: 'Pagamento Pix (ASAAS)',
      })
    }
    return { ok: true }
  }

  private async ensureCustomer(
    apiKey: string,
    pessoa: { id: string; nome: string; cpf: string; whatsapp: string | null },
    nucleoId: string,
  ): Promise<string> {
    const [m] = await this.db
      .select({ customerId: asaasCustomers.customerId })
      .from(asaasCustomers)
      .where(and(eq(asaasCustomers.pessoaId, pessoa.id), eq(asaasCustomers.nucleoId, nucleoId)))
      .limit(1)
    if (m) return m.customerId

    const customerId = await this.asaas.criarCustomer(apiKey, pessoa)
    await this.db
      .insert(asaasCustomers)
      .values({ pessoaId: pessoa.id, nucleoId, customerId })
      .onConflictDoNothing()
    return customerId
  }

  private async saldo(contaId: string): Promise<number> {
    const movs = await this.db
      .select({ tipo: lancamentos.tipo, valor: lancamentos.valor })
      .from(lancamentos)
      .where(eq(lancamentos.contaId, contaId))
    return movs.reduce((s, m) => s + (m.tipo === 'debito' ? 1 : -1) * toCents(m.valor), 0)
  }
}
