import { Injectable } from '@nestjs/common'
import type { LoginInput, TokenPair } from '@pdv-udv/shared'
import { CognitoService } from './cognito.service'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly tokens: TokenService,
  ) {}

  /** Login de staff: Cognito (SRP no backend) -> valida -> emite NOSSO JWT. */
  async loginStaff(input: LoginInput): Promise<TokenPair> {
    const { idToken } = await this.cognito.authenticateWithSrp(input.email, input.password)
    const claims = await this.cognito.verifyToken(idToken)
    const sub = String(claims.sub)

    // TODO: buscar usuário interno por cognito_sub -> role + nucleo_id (tabela `usuarios`).
    return this.tokens.issue({ sub, nucleoId: null, role: 'admin' })
  }
}
