const ACCESS = 'pdv.accessToken'
const REFRESH = 'pdv.refreshToken'

export type TokenPair = { accessToken: string; refreshToken: string }

export function setTokens(t: TokenPair) {
  localStorage.setItem(ACCESS, t.accessToken)
  localStorage.setItem(REFRESH, t.refreshToken)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
}
