/**
 * Fuso horário do núcleo, usado para exibir datas/horas locais (recibo, filtros, relatórios).
 *
 * Default = fuso do próprio servidor (TZ do SO). Em container, defina `TZ` ou `APP_TIMEZONE`
 * (ex.: `America/Campo_Grande` para MS = UTC−4, `America/Sao_Paulo` para UTC−3).
 */
export const APP_TZ = process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone
