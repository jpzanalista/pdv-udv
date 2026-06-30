import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { type Database, contas, otpCodigos, pessoas } from '@pdv-udv/db'
import type { TokenPair } from '@pdv-udv/shared'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { DB } from '../db/db.module'
import { WhatsappService } from '../whatsapp/whatsapp.service'
import { TokenService } from './token.service'

const TTL_MIN = 5
const MAX_TENTATIVAS = 5
const REENVIO_SEGUNDOS = 60

const hash = (code: string) => createHash('sha256').update(code).digest('hex')
const gerarCodigo = () => String(Math.floor(1000 + Math.random() * 9000)) // 4 dígitos

/** Só os 11 dígitos nacionais do número (tira máscara e o DDI 55). */
function nacional(whatsapp: string): string {
  const d = whatsapp.replace(/\D/g, '')
  return (d.startsWith('55') ? d.slice(2) : d).slice(-11)
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger('OTP')

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tokens: TokenService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /** Acha a pessoa pelo WhatsApp (compara só os 11 dígitos nacionais). Mais recente, se repetir. */
  private async pessoaPorWhatsapp(whatsapp: string) {
    const nac = nacional(whatsapp)
    if (nac.length !== 11) return undefined
    const [p] = await this.db
      .select()
      .from(pessoas)
      .where(sql`right(regexp_replace(${pessoas.whatsapp}, '[^0-9]', '', 'g'), 11) = ${nac}`)
      .orderBy(desc(pessoas.createdAt))
      .limit(1)
    return p
  }

  /** Solicita OTP pelo WhatsApp. Resposta sempre genérica (anti-enumeração). */
  async request(whatsapp: string): Promise<{ enviado: true }> {
    const pessoa = await this.pessoaPorWhatsapp(whatsapp)
    if (!pessoa?.whatsapp) return { enviado: true }

    // anti-flood: não reenvia se já houve um envio há menos de REENVIO_SEGUNDOS
    const [recente] = await this.db
      .select({ createdAt: otpCodigos.createdAt })
      .from(otpCodigos)
      .where(eq(otpCodigos.pessoaId, pessoa.id))
      .orderBy(desc(otpCodigos.createdAt))
      .limit(1)
    if (recente && (Date.now() - recente.createdAt.getTime()) / 1000 < REENVIO_SEGUNDOS) {
      return { enviado: true }
    }

    const codigo = gerarCodigo()
    await this.db.insert(otpCodigos).values({
      pessoaId: pessoa.id,
      codeHash: hash(codigo),
      expiraEm: new Date(Date.now() + TTL_MIN * 60 * 1000),
    })
    try {
      await this.whatsapp.sendOtp(pessoa.whatsapp, codigo)
    } catch (e) {
      this.logger.error(`Falha ao enviar OTP: ${(e as Error).message}`)
    }
    return { enviado: true }
  }

  /** Verifica o código e, se válido, emite o JWT de sócio. */
  async verify(whatsapp: string, code: string): Promise<TokenPair> {
    const invalido = new UnauthorizedException('Código inválido ou expirado')
    const pessoa = await this.pessoaPorWhatsapp(whatsapp)
    if (!pessoa) throw invalido

    const [otp] = await this.db
      .select()
      .from(otpCodigos)
      .where(and(eq(otpCodigos.pessoaId, pessoa.id), isNull(otpCodigos.consumidoEm)))
      .orderBy(desc(otpCodigos.createdAt))
      .limit(1)
    if (!otp) throw invalido
    if (otp.expiraEm.getTime() < Date.now()) throw invalido
    if (otp.tentativas >= MAX_TENTATIVAS) throw invalido

    if (otp.codeHash !== hash(code)) {
      await this.db
        .update(otpCodigos)
        .set({ tentativas: otp.tentativas + 1 })
        .where(eq(otpCodigos.id, otp.id))
      throw invalido
    }

    await this.db
      .update(otpCodigos)
      .set({ consumidoEm: new Date() })
      .where(eq(otpCodigos.id, otp.id))

    // núcleo do sócio: o da conta em que ele é titular (se houver)
    const [conta] = await this.db
      .select({ nucleoId: contas.nucleoId })
      .from(contas)
      .where(eq(contas.titularPessoaId, pessoa.id))
      .limit(1)

    return this.tokens.issue({
      sub: pessoa.id,
      nucleoId: conta?.nucleoId ?? null,
      role: 'socio',
      pessoaId: pessoa.id,
    })
  }
}
