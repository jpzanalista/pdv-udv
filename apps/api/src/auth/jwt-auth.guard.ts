import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { TokenService } from './token.service'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>()
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException()
    try {
      req.user = await this.tokens.verifyAccess(header.slice(7))
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
