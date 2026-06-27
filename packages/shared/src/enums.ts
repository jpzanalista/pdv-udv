/** Papéis de autorização (ver ../AUTH.md). Por Núcleo, exceto `admin`. */
export const ROLES = [
  'responsavel_emporio',
  'presidencia',
  'representante_nucleo',
  'tesoureiro_1',
  'tesoureiro_2',
  'admin',
  'socio',
] as const
export type Role = (typeof ROLES)[number]

/** Formas de pagamento no caixa. "Lançar na conta" = crediário (antigo "Boleto" do TaurusPOS). */
export const PAYMENT_METHODS = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'conta', // lançar na conta (sócio = mensalidade / visitante = Pix do expediente)
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** Tipo de pessoa identificada no início da venda. */
export const PERSON_KINDS = ['socio', 'visitante'] as const
export type PersonKind = (typeof PERSON_KINDS)[number]

/** Tipos de conta do empório. */
export const ACCOUNT_TYPES = ['familiar', 'visitante', 'institucional'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

/** Tipo de terminal/dispositivo. Offline só em desktop. */
export const TERMINAL_TYPES = ['desktop', 'celular'] as const
export type TerminalType = (typeof TERMINAL_TYPES)[number]

export const EXPEDIENTE_STATUS = ['aberto', 'fechado'] as const
export type ExpedienteStatus = (typeof EXPEDIENTE_STATUS)[number]

/** Tipo de núcleo na estrutura da UDV (type 1/2/3 nos dados oficiais). */
export const NUCLEO_TYPES = ['sede', 'nucleo', 'dav'] as const
export type NucleoType = (typeof NUCLEO_TYPES)[number]

/** Movimento de caixa: sangria (saída) / suprimento (entrada). */
export const MOVIMENTO_TIPOS = ['sangria', 'suprimento'] as const
export type MovimentoTipo = (typeof MOVIMENTO_TIPOS)[number]
export const MOVIMENTO_DESTINOS = ['tesouraria', 'compra'] as const
export type MovimentoDestino = (typeof MOVIMENTO_DESTINOS)[number]
