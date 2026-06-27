import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, pessoas, usuarios } from '@pdv-udv/db'
import type { LoginInput, TokenPair } from '@pdv-udv/shared'
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

  /** Login de staff: Cognito (SRP no backend) -> valida -> emite NOSSO JWT. */
  async loginStaff(input: LoginInput): Promise<TokenPair> {
    const { idToken } = await this.cognito.authenticateWithSrp(input.email, input.password)
    const claims = await this.cognito.verifyToken(idToken)
    const sub = String(claims.sub)

    // TODO: buscar usuário interno por cognito_sub -> role + nucleo_id (tabela `usuarios`).
    return this.tokens.issue({ sub, nucleoId: null, role: 'admin' })
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
