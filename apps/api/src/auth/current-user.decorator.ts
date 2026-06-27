import { type ExecutionContext, createParamDecorator } from '@nestjs/common'
import type { JwtClaims } from '@pdv-udv/shared'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtClaims => {
    return ctx.switchToHttp().getRequest().user
  },
)
