// Landing por perfil: cada papel cai direto na sua área ao logar.
// Papéis sem área própria ainda (admin, socio) caem no hub ('/').
const ROLE_LANDING: Record<string, string> = {
  responsavel_emporio: '/caixa',
  presidencia: '/relatorios',
  representante_nucleo: '/relatorios',
  tesoureiro_1: '/relatorios',
  tesoureiro_2: '/relatorios',
  socio: '/portal',
}

export function landingFor(role: string): string {
  return ROLE_LANDING[role] ?? '/'
}
