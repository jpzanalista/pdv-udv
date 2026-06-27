import { getToken } from './auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { message?: string } | null,
  ) {
    super(body?.message ?? `HTTP ${status}`)
    this.name = 'ApiError'
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = opts
  const token = auth ? getToken() : null
  const res = await fetch(`${BASE}/api${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, body)
  return body as T
}
