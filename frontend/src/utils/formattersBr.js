export function maskTime(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

export function maskCurrencyBr(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  const cents = Number(digits) / 100
  return cents.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseCurrencyBr(value) {
  const cleaned = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}
