const ACCESS = 'pdv.accessToken'
const REFRESH = 'pdv.refreshToken'
const IMP = 'pdv.impToken' // token de observação (sessionStorage — isolado por aba)
const IMP_LABEL = 'pdv.impLabel'

export type TokenPair = { accessToken: string; refreshToken: string }

export function setTokens(t: TokenPair) {
  localStorage.setItem(ACCESS, t.accessToken)
  localStorage.setItem(REFRESH, t.refreshToken)
}

/** Handoff da observação: token chega por #imp=...&lbl=... → sessionStorage (só nesta aba). */
function capturarImpersonation() {
  if (typeof window === 'undefined') return
  if (!window.location.hash.includes('imp=')) return
  const p = new URLSearchParams(window.location.hash.slice(1))
  const t = p.get('imp')
  if (!t) return
  sessionStorage.setItem(IMP, t)
  const lbl = p.get('lbl')
  if (lbl) sessionStorage.setItem(IMP_LABEL, decodeURIComponent(lbl))
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  capturarImpersonation()
  const imp = sessionStorage.getItem(IMP)
  if (imp) return imp // aba em observação usa o token do gestor escopado
  return localStorage.getItem(ACCESS)
}

export function impLabel(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(IMP_LABEL)
}

export function sairObservacao() {
  sessionStorage.removeItem(IMP)
  sessionStorage.removeItem(IMP_LABEL)
}

export function clearTokens() {
  // Numa aba em observação, "Sair" encerra só a observação (não desloga o gestor).
  if (typeof window !== 'undefined' && sessionStorage.getItem(IMP)) {
    sairObservacao()
    return
  }
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
}
