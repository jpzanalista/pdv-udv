import { Injectable, NotImplementedException } from '@nestjs/common'
import { type JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Autenticação contra o Cognito (REUNI) — TUDO no backend (ver ../AUTH.md).
 * O front nunca fala com o Cognito.
 */
@Injectable()
export class CognitoService {
  private readonly region = process.env.COGNITO_REGION ?? 'us-east-1'
  private readonly userPoolId = process.env.COGNITO_USER_POOL_ID ?? ''
  private readonly clientId = process.env.COGNITO_CLIENT_ID ?? ''

  get issuer(): string {
    return `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`
  }

  private readonly jwks = createRemoteJWKSet(
    new URL(`${this.issuer}/.well-known/jwks.json`),
  )

  /** Valida um token emitido pelo Cognito (assinatura via JWKS + issuer). */
  async verifyToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer })
    return payload
  }

  /**
   * TODO (próxima fatia): implementar USER_SRP_AUTH no backend com
   * `amazon-cognito-identity-js` (cliente SRP em Node). `InitiateAuth` USER_SRP_AUTH
   * não exige credencial AWS/IAM — usa só o App Client ID (`this.clientId`).
   */
  async authenticateWithSrp(_email: string, _password: string): Promise<{ idToken: string }> {
    void this.clientId
    throw new NotImplementedException(
      'Cognito USER_SRP_AUTH ainda não implementado — próxima fatia',
    )
  }
}
