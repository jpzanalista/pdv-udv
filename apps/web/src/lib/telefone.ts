// Telefone padrão brasileiro: +55 (XX) XXXXX-XXXX (DDD + 9 dígitos).
// O +55 (código do país) vem pré-preenchido; o usuário edita só o nacional.

/** Só os 11 dígitos nacionais (DDD + número), tirando o 55 do país do começo. */
function nacional(v: string): string {
  let d = v.replace(/\D/g, '')
  if (d.startsWith('55')) d = d.slice(2) // o +55 do prefixo é sempre o país
  return d.slice(0, 11)
}

/** Formata para +55 (XX) XXXXX-XXXX, mantendo o +55 mesmo sem nada digitado. */
export function maskTelefone(v: string): string {
  const d = nacional(v)
  const ddd = d.slice(0, 2)
  const parte1 = d.slice(2, 7)
  const parte2 = d.slice(7, 11)

  if (!ddd) return '+55 '
  let out = `+55 (${ddd}${ddd.length === 2 ? ')' : ''}`
  if (parte1) out += ` ${parte1}`
  if (parte2) out += `-${parte2}`
  return out
}

/** Valor inicial do campo de telefone (já com +55). */
export const TELEFONE_INICIAL = '+55 '

/** True quando o telefone tem DDD + 9 dígitos completos. */
export function telefoneCompleto(v: string): boolean {
  return nacional(v).length === 11
}

/** Valor a salvar: o telefone só quando completo; senão undefined (não grava "+55 " vazio). */
export function telefoneParaSalvar(v: string): string | undefined {
  return telefoneCompleto(v) ? v.trim() : undefined
}
