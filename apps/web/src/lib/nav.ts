// Landing por perfil: cada papel cai direto na sua área ao logar.
// Papéis sem área própria ainda (admin, socio) caem no hub ('/').
const ROLE_LANDING: Record<string, string> = {
  responsavel_emporio: '/caixa',
  tesoureiro_1: '/tesouraria',
  tesoureiro_2: '/tesouraria',
  presidencia: '/historico', // provisório até existirem dashboards de relatório
  representante_nucleo: '/historico',
}

export function landingFor(role: string): string {
  return ROLE_LANDING[role] ?? '/'
}
