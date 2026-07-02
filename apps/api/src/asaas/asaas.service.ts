import { Injectable, Logger } from '@nestjs/common'

export type SubcontaInfo = { apiKey: string; walletId: string }
export type PixCharge = {
  paymentId: string
  invoiceUrl: string
  copiaECola: string
  qrImage: string | null
}

/**
 * Cliente ASAAS com provedor trocável por env.
 * - ASAAS_MASTER_API_KEY setada → chama o ASAAS de verdade (subcontas + Pix).
 * - sem env                     → modo STUB (ids/payload fake) para testar o fluxo todo.
 * Cada núcleo tem sua subconta (apiKey própria); o Pix cai na subconta do núcleo.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger('ASAAS')
  private readonly base = (process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3').replace(
    /\/$/,
    '',
  )
  // No piloto (1 núcleo) a chave única do .env já é a "master". Aceita os dois nomes.
  private readonly masterKey = process.env.ASAAS_MASTER_API_KEY ?? process.env.ASAAS_API_KEY

  get isStub(): boolean {
    return !this.masterKey
  }

  private async call(
    path: string,
    opts: { method?: string; apiKey: string; body?: unknown },
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.base}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        access_token: opts.apiKey,
        'User-Agent': 'pdv-udv',
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      this.logger.error(`ASAAS ${opts.method ?? 'GET'} ${path} ${res.status}: ${JSON.stringify(data)}`)
      throw new Error(`ASAAS erro ${res.status}`)
    }
    return data
  }

  /** Cria a subconta (white-label) do núcleo. KYC é feito depois no painel ASAAS. */
  async provisionarSubconta(nucleo: {
    id: string
    nome: string
    cnpj: string | null
    tesEmail: string | null
    presEmail: string | null
  }): Promise<SubcontaInfo> {
    if (this.isStub) {
      const s = nucleo.id.slice(0, 8)
      return { apiKey: `stub_key_${s}`, walletId: `stub_wallet_${s}` }
    }
    const data = await this.call('/accounts', {
      method: 'POST',
      apiKey: this.masterKey as string,
      body: {
        name: nucleo.nome,
        email: nucleo.tesEmail ?? nucleo.presEmail ?? `nucleo+${nucleo.id}@udv.local`,
        cpfCnpj: nucleo.cnpj ?? undefined,
        // ASAAS pode exigir mais campos (mobilePhone, address...) — ajustar conforme o retorno.
      },
    })
    return { apiKey: String(data.apiKey), walletId: String(data.walletId) }
  }

  /** Cria/garante o customer da pessoa DENTRO da subconta (apiKey do núcleo). */
  async criarCustomer(
    apiKey: string,
    pessoa: { id: string; nome: string; cpf: string; whatsapp: string | null },
  ): Promise<string> {
    if (this.isStub) return `stub_cus_${pessoa.id.slice(0, 8)}`
    const data = await this.call('/customers', {
      method: 'POST',
      apiKey,
      body: {
        name: pessoa.nome,
        cpfCnpj: pessoa.cpf,
        mobilePhone: pessoa.whatsapp?.replace(/\D/g, '') || undefined,
      },
    })
    return String(data.id)
  }

  /**
   * Cria a cobrança Pix na subconta e devolve copia-e-cola + QR.
   * `dueDate` (YYYY-MM-DD) define o vencimento; as notificações do ASAAS (régua,
   * incluindo reenvios de vencido por WhatsApp) ficam LIGADAS por padrão.
   */
  async criarPix(
    apiKey: string,
    customerId: string,
    valorCents: number,
    descricao: string,
    dueDate?: string,
  ): Promise<PixCharge> {
    if (this.isStub) {
      const id = `stub_pay_${Math.random().toString(36).slice(2, 10)}`
      return {
        paymentId: id,
        invoiceUrl: `https://sandbox.asaas.com/i/${id}`,
        copiaECola: `00020101br.gov.bcb.pix-STUB-${id}`,
        qrImage: null,
      }
    }
    const venc = dueDate ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const pay = await this.call('/payments', {
      method: 'POST',
      apiKey,
      body: {
        customer: customerId,
        billingType: 'PIX',
        value: Number((valorCents / 100).toFixed(2)),
        dueDate: venc,
        description: descricao,
      },
    })
    const qr = await this.call(`/payments/${pay.id}/pixQrCode`, { apiKey })
    return {
      paymentId: String(pay.id),
      invoiceUrl: String(pay.invoiceUrl ?? ''),
      copiaECola: String(qr.payload ?? ''),
      qrImage: qr.encodedImage ? String(qr.encodedImage) : null,
    }
  }
}
