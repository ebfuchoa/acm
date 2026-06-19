const TOKEN_KEY = 'acm_token'
const AUTH_KEY = 'acm_auth'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuth() {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveAuth(auth) {
  localStorage.setItem(TOKEN_KEY, auth.access_token)
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated() {
  return Boolean(getToken())
}

export function getDisplayUnitName(auth = getAuth()) {
  if (!auth || auth.is_admin) return 'ACM'
  return auth.social_unit_name || 'ACM'
}

export function getDisplayUnitTitle(auth = getAuth()) {
  const unitName = getDisplayUnitName(auth)
  return unitName === 'ACM' ? 'ACM' : `Unidade Social - ${unitName}`
}
