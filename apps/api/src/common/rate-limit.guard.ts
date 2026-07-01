import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

export const RATE_LIMIT = 'rate_limit'
export type RateRule = { limit: number; windowMs: number }

/** Limita tentativas por IP+rota (janela fixa, em memória). Ex.: @RateLimit(5) = 5/min. */
export const RateLimit = (limit: number, windowMs = 60_000) =>
  SetMetadata(RATE_LIMIT, { limit, windowMs })

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; reset: number }>()

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const rule = this.reflector.getAllAndOverride<RateRule | undefined>(RATE_LIMIT, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!rule) return true

    const req = ctx.switchToHttp().getRequest<Request & { route?: { path?: string } }>()
    const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    const ip = fwd || req.ip || 'desconhecido'
    const key = `${ip}:${req.route?.path ?? req.originalUrl}`
    const now = Date.now()

    const atual = this.hits.get(key)
    if (!atual || atual.reset <= now) {
      this.hits.set(key, { count: 1, reset: now + rule.windowMs })
      this.limpar(now)
      return true
    }
    if (atual.count >= rule.limit) {
      throw new HttpException('Muitas tentativas. Aguarde um instante.', HttpStatus.TOO_MANY_REQUESTS)
    }
    atual.count++
    return true
  }

  private limpar(now: number) {
    if (this.hits.size < 5000) return
    for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k)
  }
}
