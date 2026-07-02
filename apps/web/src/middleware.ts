import { type NextRequest, NextResponse } from 'next/server'

/**
 * Roteamento por subdomínio. A raiz de cada público vai para a sua porta de entrada;
 * a diretoria usa o próprio hub em "/". A isolação de login vem da origem (localStorage por host).
 *   pdv.emporio.cloud       → /login/emporio (responsável → /caixa)
 *   socio.emporio.cloud     → /portal
 *   admin.emporio.cloud     → /admin
 *   diretoria.emporio.cloud → / (hub)
 */
const ENTRADA: Record<string, string> = {
  pdv: '/login/emporio',
  socio: '/portal',
  admin: '/admin',
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const sub = host.split(':')[0].split('.')[0]
  const dest = ENTRADA[sub]
  if (dest && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(dest, req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/'], // só a raiz; o resto é roteado pelas próprias páginas (auth no cliente)
}
