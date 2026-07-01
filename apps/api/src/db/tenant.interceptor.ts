import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import type { JwtClaims } from '@pdv-udv/shared'
import type { Pool } from 'pg'
import { type Observable, firstValueFrom, from } from 'rxjs'
import { POOL } from './db.module'
import { runInContext } from './tenant'

/**
 * Abre, para cada requisição autenticada, uma conexão com o contexto de RLS:
 * - gestor da plataforma → bypass (vê todos os núcleos);
 * - demais papéis → só o núcleo do token.
 * Requisições sem usuário (login, webhook, health) usam o db base (fail-closed
 * para tabelas de núcleo; as tabelas de autenticação são isentas de RLS).
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: JwtClaims }>()
    const user = req.user
    if (!user) return next.handle()
    const ctx =
      user.role === 'gestor_plataforma' ? { bypass: true } : { nucleoId: user.nucleoId }
    return from(runInContext(this.pool, ctx, () => firstValueFrom(next.handle())))
  }
}
