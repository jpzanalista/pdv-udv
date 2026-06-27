import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, nucleos, pessoas, usuarios } from '@pdv-udv/db'
import { type JwtClaims, type LoginInput, type TokenPair, parseCargos, pickBestRole } from '@pdv-udv/shared'
import { eq } from 'drizzle-orm'
import { DB } from '../db/db.module'
import { CognitoService } from './cognito.service'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly tokens: TokenService,
    @Inject(DB) private readonly db: Database,
  ) {}

  /** Login de staff: Cognito (SRP no backend) → claims → cargo→papel → núcleo → NOSSO JWT. */
  async loginStaff(input: LoginInput): Promise<TokenPair> {
    const { idToken } = await this.cognito.authenticateWithSrp(input.email, input.password)
    const claims = await this.cognito.verifyToken(idToken)

    const cargos = parseCargos(claims['custom:cargos'] ?? claims['custom:cargo_codigo'])
    const role = pickBestRole(cargos)
    if (!role) {
      throw new ForbiddenException('Sem cargo autorizado para o empório')
    }

    // Núcleo via custom:nucleo_codigo → casa com nucleos.udv_id
    const nucleoCodigo = claims['custom:nucleo_codigo']
      ? Number(claims['custom:nucleo_codigo'])
      : null
    const nucleo = nucleoCodigo
      ? (await this.db.select().from(nucleos).where(eq(nucleos.udvId, nucleoCodigo)).limit(1))[0]
      : null

    // Upsert do usuário por cognito_sub
    const [usuario] = await this.db
      .insert(usuarios)
      .values({ cognitoSub: claims.sub, role, nucleoId: nucleo?.id ?? null })
      .onConflictDoUpdate({
        target: usuarios.cognitoSub,
        set: { role, nucleoId: nucleo?.id ?? null },
      })
      .returning()

    return this.tokens.issue({ sub: usuario.id, nucleoId: usuario.nucleoId, role: usuario.role })
  }

  /** "Quem sou eu?" — claims do JWT + nome do núcleo. */
  async me(claims: JwtClaims) {
    const nucleo = claims.nucleoId
      ? (await this.db.select().from(nucleos).where(eq(nucleos.id, claims.nucleoId)).limit(1))[0]
      : null
    return {
      sub: claims.sub,
      role: claims.role,
      nucleoId: claims.nucleoId,
      nucleoNome: nucleo?.nome ?? null,
    }
  }

  /** DEV: mostra os claims/cargos lidos do token (sem barrar por papel). */
  async srpDebug(input: LoginInput) {
    const { idToken } = await this.cognito.authenticateWithSrp(input.email, input.password)
    const claims = await this.cognito.verifyToken(idToken)
    const cargos = parseCargos(claims['custom:cargos'] ?? claims['custom:cargo_codigo'])
    return {
      email: claims.email,
      name: claims.name,
      sub: claims.sub,
      cargos,
      papelDerivado: pickBestRole(cargos),
      nucleoCodigo: claims['custom:nucleo_codigo'] ?? null,
      nucleoNome: claims['custom:nucleo_nome'] ?? null,
      regiaoNome: claims['custom:regiao_nome'] ?? null,
      grau: claims['custom:grau'] ?? null,
    }
  }

  /** Login de desenvolvimento: acha o usuário pelo e-mail da pessoa e emite o JWT. */
  async devLogin(email: string): Promise<TokenPair> {
    const [pessoa] = await this.db.select().from(pessoas).where(eq(pessoas.email, email)).limit(1)
    if (!pessoa) throw new NotFoundException('Pessoa não encontrada para esse e-mail')

    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.pessoaId, pessoa.id))
      .limit(1)
    if (!usuario) throw new NotFoundException('Usuário não encontrado para essa pessoa')

    return this.tokens.issue({
      sub: usuario.id,
      nucleoId: usuario.nucleoId,
      role: usuario.role,
    })
  }
}
