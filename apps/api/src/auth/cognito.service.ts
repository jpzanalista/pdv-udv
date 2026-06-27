import { Injectable, UnauthorizedException } from '@nestjs/common'
import {
  AuthenticationDetails,
  CognitoUser,
  type CognitoUserSession,
  CognitoUserPool,
  type ICognitoStorage,
} from 'amazon-cognito-identity-js'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/** Claims do id_token do Cognito (REUNI popula os custom:* — ver AUTH.md). */
export type CognitoIdClaims = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  token_use?: string
  'custom:cargos'?: string
  'custom:cargo_codigo'?: string
  'custom:cargo_nome'?: string
  'custom:nucleo_codigo'?: string
  'custom:nucleo_nome'?: string
  'custom:regiao_codigo'?: string
  'custom:regiao_nome'?: string
  'custom:reuni_codigo'?: string
  'custom:grau'?: string
}

/** Storage em memória — o amazon-cognito-identity-js espera localStorage (browser). */
function memoryStorage(): ICognitoStorage {
  const store = new Map<string, string>()
  return {
    setItem: (k, v) => store.set(k, v),
    getItem: (k) => store.get(k) ?? null,
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

/** Autenticação contra o Cognito (REUNI) — TUDO no backend. O front nunca fala com o Cognito. */
@Injectable()
export class CognitoService {
  private readonly region = process.env.COGNITO_REGION ?? 'us-east-1'
  private readonly userPoolId = process.env.COGNITO_USER_POOL_ID ?? ''
  private readonly clientId = process.env.COGNITO_CLIENT_ID ?? ''

  get issuer(): string {
    return `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`
  }

  private readonly jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`))

  /** Valida o id_token (assinatura JWKS + issuer + audience + token_use=id). */
  async verifyToken(idToken: string): Promise<CognitoIdClaims> {
    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: this.issuer,
      audience: this.clientId,
    })
    if (payload.token_use !== 'id') {
      throw new UnauthorizedException("token_use deve ser 'id'")
    }
    return payload as unknown as CognitoIdClaims
  }

  /** USER_SRP_AUTH no backend (não exige credencial AWS/IAM — usa só o App Client ID). */
  authenticateWithSrp(email: string, password: string): Promise<{ idToken: string }> {
    const pool = new CognitoUserPool({
      UserPoolId: this.userPoolId,
      ClientId: this.clientId,
      Storage: memoryStorage(),
    })
    const user = new CognitoUser({ Username: email, Pool: pool, Storage: memoryStorage() })
    user.setAuthenticationFlowType('USER_SRP_AUTH')
    const details = new AuthenticationDetails({ Username: email, Password: password })

    return new Promise((resolve, reject) => {
      user.authenticateUser(details, {
        onSuccess: (session: CognitoUserSession) =>
          resolve({ idToken: session.getIdToken().getJwtToken() }),
        onFailure: (err) =>
          reject(new UnauthorizedException(err?.message ?? 'falha na autenticação')),
        newPasswordRequired: () =>
          reject(new UnauthorizedException('troca de senha obrigatória no Cognito')),
      })
    })
  }
}
