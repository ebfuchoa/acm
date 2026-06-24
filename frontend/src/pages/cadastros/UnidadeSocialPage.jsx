import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'
import { StateCityFields } from '../../components/StateCityFields'

const emptyForm = { name: '', address: '', district: '', city: '', zip_code: '', state: '', phone: '', email: '' }
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado' },
]

function maskZipCode(value) { const d = value.replace(/\D/g, '').slice(0, 8); return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}` }
function maskPhone(value) { const d = value.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return `(${d}`; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` }
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }

export function UnidadeSocialPage() {
  const [mode, setMode] = useState('list')
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setForm(emptyForm)
      setFieldErrors({})
      setError('')
      setMessage('')
    }
    window.addEventListener('unidade-social:list', showList)
    return () => window.removeEventListener('unidade-social:list', showList)
  }, [])

  const filteredRows = useMemo(() => {
    return units.filter((row) => columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(search.toLowerCase())))
  }, [units, search])

  async function loadUnits() {
    try { setUnits(await api('/unidades-sociais')); setError('') } catch (err) { setError(err.message) }
  }

  useEffect(() => { loadUnits() }, [])

  function onChange(key, value) {
    let next = value
    if (key === 'zip_code') next = maskZipCode(value)
    if (key === 'phone') next = maskPhone(value)
    if (key === 'state') { setForm((p) => ({ ...p, state: next, city: '' })); return }
    setForm((p) => ({ ...p, [key]: next }))
  }

  function validateForm(payload) {
    const errors = {}
    Object.entries(payload).forEach(([k, v]) => { if (!String(v).trim()) errors[k] = 'Campo obrigatório.' })
    if (payload.zip_code && !/^\d{5}-\d{3}$/.test(payload.zip_code)) errors.zip_code = 'CEP deve estar no formato 00000-000.'
    if (payload.phone && !/^\(\d{2}\)\s\d{5}-\d{4}$/.test(payload.phone)) errors.phone = 'Telefone deve estar no formato (00) 00000-0000.'
    if (payload.email && !validateEmail(payload.email)) errors.email = 'Informe um e-mail válido.'
    return errors
  }

  function normalizedPayload() {
    return {
      name: form.name.trim(), address: form.address.trim(), district: form.district.trim(), city: form.city.trim(),
      zip_code: form.zip_code.trim(), state: form.state.trim().toUpperCase(), phone: form.phone.trim(), email: form.email.trim(), is_matrix: false,
    }
  }

  async function saveUnit(e) {
    e.preventDefault(); setError(''); setMessage('')
    const payload = normalizedPayload(); const errors = validateForm(payload); setFieldErrors(errors)
    if (Object.keys(errors).length > 0) { setError('Revise os campos obrigatórios e formatos antes de salvar.'); return }
    try {
      if (editingId) await api(`/unidades-sociais/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/unidades-sociais', { method: 'POST', body: JSON.stringify(payload) })
      setForm(emptyForm); setEditingId(null); setFieldErrors({}); await loadUnits(); setMode('list'); setMessage('Registro salvo com sucesso.')
    } catch (err) { setError(err.message) }
  }

  async function onEdit(row) {
    const u = await api(`/unidades-sociais/${row.id}`)
    setForm({ name: u.name || '', address: u.address || '', district: u.district || '', city: u.city || '', zip_code: u.zip_code || '', state: u.state || '', phone: u.phone || '', email: u.email || '' })
    setEditingId(u.id); setMode('form'); setFieldErrors({}); setMessage(''); setError('')
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusão da unidade?')) return
    try {
      await api(`/unidades-sociais/${row.id}`, { method: 'DELETE' })
      await loadUnits()
      setMessage('Unidade excluída com sucesso.')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (mode === 'form') {
    return (
      <section>
        <h2>{editingId ? 'Editar Unidade Social' : 'Cadastrar Unidade Social'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={saveUnit} className="card">
          <div className="form-row">
            <div className="field"><label>Nome da Unidade</label><input value={form.name} onChange={(e) => onChange('name', e.target.value)} required />{fieldErrors.name && <p className="error">{fieldErrors.name}</p>}</div>
            <div className="field"><label>Endereço</label><input value={form.address} onChange={(e) => onChange('address', e.target.value)} required />{fieldErrors.address && <p className="error">{fieldErrors.address}</p>}</div>
          </div>
          <div className="form-row form-row-3">
            <div className="field"><label>Bairro</label><input value={form.district} onChange={(e) => onChange('district', e.target.value)} required />{fieldErrors.district && <p className="error">{fieldErrors.district}</p>}</div>
            <StateCityFields
              stateValue={form.state}
              cityValue={form.city}
              onStateChange={(value) => onChange('state', value)}
              onCityChange={(value) => onChange('city', value)}
              required
              stateError={fieldErrors.state}
              cityError={fieldErrors.city}
            />
          </div>
          <div className="form-row form-row-3">
            <div className="field"><label>CEP</label><input value={form.zip_code} onChange={(e) => onChange('zip_code', e.target.value)} required />{fieldErrors.zip_code && <p className="error">{fieldErrors.zip_code}</p>}</div>
            <div className="field"><label>Telefone</label><input value={form.phone} onChange={(e) => onChange('phone', e.target.value)} required />{fieldErrors.phone && <p className="error">{fieldErrors.phone}</p>}</div>
            <div className="field"><label>E-mail</label><input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} required />{fieldErrors.email && <p className="error">{fieldErrors.email}</p>}</div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => { setMode('list'); setEditingId(null); setForm(emptyForm) }}>Voltar</button><button type="submit">Salvar</button></div>
        </form>
      </section>
    )
  }

  return (
    <>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}
      <CadastroListView
        title="Unidades Sociais"
        columns={columns}
        rows={filteredRows}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={() => { setForm(emptyForm); setEditingId(null); setMode('form') }}
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6 }}>
            <ActionIconButton action="edit" label="Editar unidade social" onClick={() => onEdit(row)} />
            <ActionIconButton action="delete" label="Excluir unidade social" onClick={() => onDelete(row)} />
          </div>
        )}
      />
    </>
  )
}




