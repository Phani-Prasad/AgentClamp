// ── Auth Utilities ────────────────────────────────────────────
// Central helpers for reading/writing auth state from localStorage.

export interface AuthUser {
  id: string
  full_name: string
  email: string
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function logout(): void {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.clear()
  } catch {
    // ignore
  }
  window.location.href = '/'
}
