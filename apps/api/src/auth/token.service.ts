import { Injectable } from '@nestjs/common'
import { JwtService, type JwtSignOptions } from '@nestjs/jwt'
import type { JwtClaims, TokenPair } from '@pdv-udv/shared'

type Expires = JwtSignOptions['expiresIn']

/** Emite e valida o NOSSO JWT (token exchange após Cognito/OTP). */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  async issue(claims: JwtClaims): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(claims, {
      secret: process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as Expires,
    })
    const refreshToken = await this.jwt.signAsync(
      { sub: claims.sub },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_TTL ?? '30d') as Expires,
      },
    )
    return { accessToken, refreshToken }
  }

  async verifyAccess(token: string): Promise<JwtClaims> {
    return this.jwt.verifyAsync<JwtClaims>(token, { secret: process.env.JWT_SECRET })
  }
}
