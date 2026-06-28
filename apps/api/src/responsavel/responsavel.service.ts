import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { type Database, senhaResets, usuarios } from '@pdv-udv/db'
import type { TokenPair } from '@pdv-udv/shared'
import { and, desc, eq, gt, isNotNull, isNull } from 'drizzle-orm'
import { TokenService } from '../auth/token.service'
import { DB } from '../db/db.module'
import { EmailService } from '../email/email.service'

const TTL_HORAS = 24

function hashSenha(senha: string): string {
  const salt = randomBytes(16)
  const dk = scryptSync(senha, salt, 64)
  return `${salt.toString('hex')}:${dk.toString('hex')}`
}
function verificarSenha(senha: string, hash: string): boolean {
  const [saltHex, dkHex] = hash.split(':')
  if (!saltHex || !dkHex) return false
  const dk = scryptSync(senha, Buffer.from(saltHex, 'hex'), 64)
  const alvo = Buffer.from(dkHex, 'hex')
  return dk.length === alvo.length && timingSafeEqual(dk, alvo)
}
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

@Injectable()
export class ResponsavelService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
  ) {}

  /** Presidente/representante cadastra um responsável (e-mail) e dispara o "definir senha". */
  async cadastrar(nucleoId: string, emailRaw: string) {
    const email = emailRaw.trim().toLowerCase()
    const [existe] = await this.db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email)).limit(1)
    if (existe) throw new BadRequestException('E-mail já cadastrado')

    const [usuario] = await this.db
      .insert(usuarios)
      .values({ email, role: 'responsavel_emporio', nucleoId, ativo: true })
      .returning({ id: usuarios.id })
    await this.enviarLinkSenha(usuario.id, email, 'definir')
    return { ok: true, id: usuario.id }
  }

  async listar(nucleoId: string) {
    const rows = await this.db
      .select({ id: usuarios.id, email: usuarios.email, ativo: usuarios.ativo, passwordHash: usuarios.passwordHash })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.nucleoId, nucleoId),
          eq(usuarios.role, 'responsavel_emporio'),
          isNotNull(usuarios.email),
        ),
      )
    return rows.map((u) => ({ id: u.id, email: u.email, ativo: u.ativo, temSenha: !!u.passwordHash }))
  }

  async definirAtivo(nucleoId: string, usuarioId: string, ativo: boolean) {
    const [row] = await this.db
      .update(usuarios)
      .set({ ativo })
      .where(
        and(eq(usuarios.id, usuarioId), eq(usuarios.nucleoId, nucleoId), eq(usuarios.role, 'responsavel_emporio')),
      )
      .returning({ id: usuarios.id })
    if (!row) throw new BadRequestException('Responsável não encontrado')
    return { ok: true }
  }

  /** Login do responsável (e-mail + senha). */
  async login(emailRaw: string, senha: string): Promise<TokenPair> {
    const invalido = new UnauthorizedException('E-mail ou senha incorretos')
    const email = emailRaw.trim().toLowerCase()
    const [u] = await this.db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, email), eq(usuarios.role, 'responsavel_emporio')))
      .limit(1)
    if (!u || !u.passwordHash) throw invalido
    if (!u.ativo) throw new UnauthorizedException('Usuário inativo')
    if (!verificarSenha(senha, u.passwordHash)) throw invalido
    return this.tokens.issue({ sub: u.id, nucleoId: u.nucleoId, role: u.role })
  }

  /** Solicita redefinição de senha (resposta genérica, anti-enumeração). */
  async solicitarReset(emailRaw: string): Promise<{ ok: true }> {
    const email = emailRaw.trim().toLowerCase()
    const [u] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.email, email), eq(usuarios.role, 'responsavel_emporio'), eq(usuarios.ativo, true)))
      .limit(1)
    if (u) await this.enviarLinkSenha(u.id, email, 'reset')
    return { ok: true }
  }

  /** Define a senha a partir do token (1º acesso ou reset). */
  async definirSenha(token: string, senha: string): Promise<{ ok: true }> {
    const [reset] = await this.db
      .select()
      .from(senhaResets)
      .where(and(eq(senhaResets.tokenHash, sha256(token)), isNull(senhaResets.usadoEm), gt(senhaResets.expiraEm, new Date())))
      .orderBy(desc(senhaResets.createdAt))
      .limit(1)
    if (!reset) throw new UnauthorizedException('Link inválido ou expirado')

    await this.db.update(usuarios).set({ passwordHash: hashSenha(senha) }).where(eq(usuarios.id, reset.usuarioId))
    await this.db.update(senhaResets).set({ usadoEm: new Date() }).where(eq(senhaResets.id, reset.id))
    return { ok: true }
  }

  private async enviarLinkSenha(usuarioId: string, email: string, tipo: 'definir' | 'reset') {
    const token = randomBytes(32).toString('hex')
    await this.db.insert(senhaResets).values({
      usuarioId,
      tokenHash: sha256(token),
      expiraEm: new Date(Date.now() + TTL_HORAS * 60 * 60 * 1000),
    })
    const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const link = `${base}/definir-senha?token=${token}`
    const assunto = tipo === 'definir' ? 'Defina sua senha — PDV UDV' : 'Redefinir senha — PDV UDV'
    const verbo = tipo === 'definir' ? 'definir' : 'redefinir'
    await this.email.enviar(
      email,
      assunto,
      `Olá,\n\nAcesse o link abaixo para ${verbo} a senha de acesso ao PDV UDV (empório):\n${link}\n\nO link expira em ${TTL_HORAS} horas. Se você não solicitou, ignore este e-mail.`,
    )
  }
}
