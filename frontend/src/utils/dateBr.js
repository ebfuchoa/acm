export function maskDateBr(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export function brToIsoDate(value) {
  const v = String(value || '').trim()
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v)
  if (!m) return ''
  const [, dd, mm, yyyy] = m
  const iso = `${yyyy}-${mm}-${dd}`
  const dt = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return ''
  if (dt.getFullYear() !== Number(yyyy) || dt.getMonth() + 1 !== Number(mm) || dt.getDate() !== Number(dd)) return ''
  return iso
}

export function isoToBrDate(value) {
  const v = String(value || '').trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return ''
  const [, yyyy, mm, dd] = m
  return `${dd}/${mm}/${yyyy}`
}
