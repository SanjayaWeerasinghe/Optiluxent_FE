const BASE = import.meta.env.VITE_API_URL as string

// ── Token helpers ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('access_token')
}

function buildHeaders(token?: string | null): Record<string, string> {
  const t = token ?? getToken()
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }
}

function redirectToLogin() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

// ── Token refresh (deduplicated — concurrent 401s share one refresh call) ─────
let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    redirectToLogin()
    throw new Error('No refresh token available')
  }

  const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    redirectToLogin()
    throw new Error('Session expired')
  }

  // Response shape: { access_token, token_type, expires_in }
  // — possibly wrapped in { data: { access_token, ... } }
  const body = await res.json() as Record<string, unknown>
  const payload = (body.data as Record<string, unknown>) ?? body
  const newToken = payload.access_token as string
  localStorage.setItem('access_token', newToken)
  return newToken
}

// ── Response parser ───────────────────────────────────────────────────────────
async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    // Backend error shape: { error: { code, message } } or { message }
    const errObj = body.error as Record<string, unknown> | undefined
    const msg = (errObj?.message ?? body.message ?? `HTTP ${res.status}`) as string
    throw new Error(msg)
  }
  const body = await res.json() as Record<string, unknown>
  return ((body.data !== undefined ? body.data : body) as T)
}

// ── Core fetch with auto-refresh on 401 ──────────────────────────────────────
async function apiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const request = (token?: string | null) =>
    fetch(`${BASE}${path}`, { ...init, headers: buildHeaders(token) })

  let res = await request()

  if (res.status === 401) {
    // Deduplicate: if another request is already refreshing, wait for that one
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null })
    }
    const newToken = await refreshPromise
    res = await request(newToken)
  }

  return parse<T>(res)
}

// ── Public API ────────────────────────────────────────────────────────────────
export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch<void>(path, { method: 'DELETE' })
}
