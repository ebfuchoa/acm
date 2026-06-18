import { clearAuth, getToken } from '../auth'

const DEFAULT_API_URLS = [
  import.meta.env.VITE_API_URL,
  'http://127.0.0.1:8001/api/v1',
  'http://127.0.0.1:8000/api/v1',
  'http://localhost:8001/api/v1',
  'http://localhost:8000/api/v1',
].filter(Boolean)

function extractErrorMessage(data) {
  const translate = (msg) => {
    const text = String(msg || '')
    if (text.includes('String should have at least')) return 'Campo obrigatório.'
    if (text.includes('Field required')) return 'Campo obrigatório.'
    if (text.includes('Input should be a valid integer')) return 'Valor numérico inválido.'
    if (text.includes('Input should be a valid string')) return 'Texto inválido.'
    return text
  }

  if (!data) return 'Erro na requisicao'
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => translate(item.msg || item.message || JSON.stringify(item))).join(' | ')
  }
  if (typeof data.message === 'string') return translate(data.message)
  return 'Erro na requisicao'
}

async function callApi(baseUrl, path, options, token) {
  return fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })
}

export async function api(path, options = {}) {
  const token = getToken()
  let lastNetworkError = null

  for (const baseUrl of DEFAULT_API_URLS) {
    let response
    try {
      response = await callApi(baseUrl, path, options, token)
    } catch (err) {
      lastNetworkError = err
      continue
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) clearAuth()
      throw new Error(extractErrorMessage(data))
    }

    if (response.status === 204) return null
    return response.json()
  }

  throw new Error(lastNetworkError?.message || 'Falha de conexao com a API.')
}

export async function apiRaw(path, options = {}) {
  const token = getToken()
  let lastNetworkError = null

  for (const baseUrl of DEFAULT_API_URLS) {
    let response
    try {
      response = await callApi(baseUrl, path, options, token)
    } catch (err) {
      lastNetworkError = err
      continue
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) clearAuth()
      throw new Error(extractErrorMessage(data))
    }

    return response
  }

  throw new Error(lastNetworkError?.message || 'Falha de conexao com a API.')
}
