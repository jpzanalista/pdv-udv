// Landing por perfil: cada papel cai direto na sua área ao logar.
// Diretoria (presidência/representante) e admin entram no Início ('/'); sócio no portal.
const ROLE_LANDING: Record<string, string> = {
  responsavel_emporio: '/caixa',
  presidencia: '/',
  representante_nucleo: '/',
  tesoureiro_1: '/relatorios',
  tesoureiro_2: '/relatorios',
  socio: '/portal',
}

export function landingFor(role: string): string {
  return ROLE_LANDING[role] ?? '/'
}
