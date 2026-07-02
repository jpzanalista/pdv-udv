import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import { nucleos } from '@pdv-udv/db'
import type { JwtClaims } from '@pdv-udv/shared'
import { eq } from 'drizzle-orm'
import type { Pool } from 'pg'
import { type Observable, firstValueFrom, from } from 'rxjs'
import { POOL } from './db.module'
import { runInContext, tenantAls } from './tenant'

const LEITURA = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Abre, para cada requisição autenticada, uma conexão com o contexto de RLS:
 * - gestor da plataforma → bypass (vê todos os núcleos);
 * - demais papéis → só o núcleo do token.
 * Além disso, se o núcleo estiver SUSPENSO, bloqueia escritas (somente leitura).
 * Requisições sem usuário (login, webhook, health) usam o db base (fail-closed
 * para tabelas de núcleo; as tabelas de autenticação são isentas de RLS).
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: JwtClaims; method: string }>()
    const user = req.user
    if (!user) return next.handle()

    if (user.role === 'gestor_plataforma') {
      return from(runInContext(this.pool, { bypass: true }, () => firstValueFrom(next.handle())))
    }

    const escrita = !LEITURA.has(req.method)
    const nucleoId = user.nucleoId
    return from(
      runInContext(this.pool, { nucleoId }, async () => {
        if (escrita && nucleoId) {
          const db = tenantAls.getStore()?.db
          const [n] = db
            ? await db.select({ ativo: nucleos.ativo }).from(nucleos).where(eq(nucleos.id, nucleoId)).limit(1)
            : []
          if (n && !n.ativo) {
            throw new ForbiddenException('Empório suspenso pela plataforma — somente leitura.')
          }
        }
        return firstValueFrom(next.handle())
      }),
    )
  }
}
