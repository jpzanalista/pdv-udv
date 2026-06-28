import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, asaasCustomers, cobrancas, contas, lancamentos, nucleos, pessoas } from '@pdv-udv/db'
import { and, desc, eq } from 'drizzle-orm'
import { DB } from '../db/db.module'
import { AsaasService } from './asaas.service'

const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)
const toReais = (cents: number) => (cents / 100).toFixed(2)
const hojeStr = () => new Date().toISOString().slice(0, 10)

/** Soma N dias ÚTEIS (seg–sex) a uma data e devolve YYYY-MM-DD. */
function vencimentoDiasUteis(n: number): string {
  const d = new Date()
  let add = 0
  while (add < n) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) add++
  }
  return d.toISOString().slice(0, 10)
}

type Pessoa = { id: string; nome: string; cpf: string; whatsapp: string | null }
type ContaRef = { id: string; nucleoId: string; nome: string }

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
    if (nucleo.asaasApiKey) return { jaProvisionada: true, walletId: nucleo.asaasWalletId }
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

    const apiKey = await this.resolveApiKey(conta.nucleoId)
    const [pessoa] = await this.db.select().from(pessoas).where(eq(pessoas.id, pessoaId)).limit(1)
    const pix = await this.criarCobranca(conta, pessoa, apiKey, valor, vencimentoDiasUteis(1), `Quitação ${conta.nome}`)
    return { ...pix, valorCents: valor }
  }

  /** Responsável: cobra todos os visitantes com saldo > 0 e sem cobrança pendente. */
  async cobrarVisitantes(nucleoId: string) {
    const apiKey = await this.resolveApiKey(nucleoId)
    const lista = await this.db
      .select({ id: contas.id, nucleoId: contas.nucleoId, nome: contas.nome, titular: contas.titularPessoaId })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.tipo, 'visitante')))

    let cobrados = 0
    let pulados = 0
    let semCadastro = 0
    const dueDate = vencimentoDiasUteis(5)

    for (const conta of lista) {
      const saldo = await this.saldo(conta.id)
      if (saldo <= 0) continue
      if (await this.temCobrancaPendente(conta.id)) {
        pulados++
        continue
      }
      if (!conta.titular) {
        semCadastro++
        continue
      }
      const [pessoa] = await this.db.select().from(pessoas).where(eq(pessoas.id, conta.titular)).limit(1)
      await this.criarCobranca(conta, pessoa, apiKey, saldo, dueDate, `Empório — ${conta.nome}`)
      cobrados++
    }
    return { cobrados, pulados, semCadastro }
  }

  /** Status dos visitantes para a tela do responsável. */
  async statusVisitantes(nucleoId: string) {
    const lista = await this.db
      .select({ id: contas.id, nome: contas.nome, titular: contas.titularPessoaId })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.tipo, 'visitante')))

    const hoje = hojeStr()
    const out = []
    for (const conta of lista) {
      const movs = await this.db
        .select({ tipo: lancamentos.tipo, valor: lancamentos.valor, data: lancamentos.createdAt, descricao: lancamentos.descricao })
        .from(lancamentos)
        .where(eq(lancamentos.contaId, conta.id))
        .orderBy(desc(lancamentos.createdAt))
      const saldoCents = movs.reduce((s, m) => s + (m.tipo === 'debito' ? 1 : -1) * toCents(m.valor), 0)
      const itensAbertos = movs
        .filter((m) => m.tipo === 'debito')
        .map((m) => ({ data: m.data, valorCents: toCents(m.valor), descricao: m.descricao }))

      const [cob] = await this.db
        .select({ dueDate: cobrancas.dueDate, invoiceUrl: cobrancas.invoiceUrl })
        .from(cobrancas)
        .where(and(eq(cobrancas.contaId, conta.id), eq(cobrancas.status, 'pendente')))
        .orderBy(desc(cobrancas.createdAt))
        .limit(1)

      let status: 'pago' | 'a_cobrar' | 'enviado' | 'inadimplente'
      if (saldoCents <= 0) status = 'pago'
      else if (!cob) status = 'a_cobrar'
      else status = cob.dueDate && cob.dueDate < hoje ? 'inadimplente' : 'enviado'

      let whatsapp: string | null = null
      if (conta.titular) {
        const [p] = await this.db
          .select({ whatsapp: pessoas.whatsapp })
          .from(pessoas)
          .where(eq(pessoas.id, conta.titular))
          .limit(1)
        whatsapp = p?.whatsapp ?? null
      }

      out.push({
        id: conta.id,
        nome: conta.nome,
        whatsapp,
        saldoCents,
        status,
        vencimento: cob?.dueDate ?? null,
        invoiceUrl: cob?.invoiceUrl ?? null,
        itensAbertos,
      })
    }
    return out
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

  // ---------- internos ----------

  private async criarCobranca(
    conta: ContaRef,
    pessoa: Pessoa,
    apiKey: string,
    valorCents: number,
    dueDate: string,
    descricao: string,
  ) {
    const customerId = await this.ensureCustomer(apiKey, pessoa, conta.nucleoId)
    const pix = await this.asaas.criarPix(apiKey, customerId, valorCents, descricao, dueDate)
    await this.db.insert(cobrancas).values({
      nucleoId: conta.nucleoId,
      contaId: conta.id,
      asaasPaymentId: pix.paymentId,
      valor: toReais(valorCents),
      status: 'pendente',
      invoiceUrl: pix.invoiceUrl,
      dueDate,
    })
    return { paymentId: pix.paymentId, copiaECola: pix.copiaECola, qrImage: pix.qrImage, invoiceUrl: pix.invoiceUrl }
  }

  private async resolveApiKey(nucleoId: string): Promise<string> {
    const [nucleo] = await this.db.select().from(nucleos).where(eq(nucleos.id, nucleoId)).limit(1)
    const apiKey = nucleo?.asaasApiKey ?? null
    if (apiKey) return apiKey
    if (this.asaas.isStub) return 'stub'
    throw new BadRequestException('Subconta ASAAS do núcleo não provisionada')
  }

  private async temCobrancaPendente(contaId: string): Promise<boolean> {
    const [c] = await this.db
      .select({ id: cobrancas.id })
      .from(cobrancas)
      .where(and(eq(cobrancas.contaId, contaId), eq(cobrancas.status, 'pendente')))
      .limit(1)
    return !!c
  }

  private async ensureCustomer(apiKey: string, pessoa: Pessoa, nucleoId: string): Promise<string> {
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
