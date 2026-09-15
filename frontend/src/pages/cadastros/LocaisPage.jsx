import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'

const emptyForm = { name: '', unit_id: '' }

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canChooseUnit(auth) {
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['administrador do sistema', 'secretaria executiva', 'secretaria administrativa'].includes(profile)
}

const columns = [
  { key: 'sequence', label: 'Nº' },
  { key: 'name', label: 'Local' },
  { key: 'unit_name', label: 'Unidade Social' },
]

export function LocaisPage() {
  const auth = getAuth()
  const canSelectUnit = canChooseUnit(auth)
  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
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
    window.addEventListener('locais:list', showList)
    return () => window.removeEventListener('locais:list', showList)
  }, [])

  async function loadRows() {
    try {
      setLoading(true)
      const data = await api(`/locais?page=1&page_size=100&search=${encodeURIComponent(search.trim())}`)
      setRows(data.items || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadUnits() {
    if (!canSelectUnit) return
    try {
      const data = await api('/gestao-unidades')
      setUnits(data || [])
    } catch {
      setUnits([])
    }
  }

  useEffect(() => { loadRows() }, [search])
  useEffect(() => { loadUnits() }, [])

  const displayRows = useMemo(() => rows.map((row, index) => ({
    ...row,
    sequence: index + 1,
    unit_name: row.unit_name || '-',
  })), [rows])

  function getDefaultUnitId() {
    return canSelectUnit ? '' : String(auth?.social_unit_id || '')
  }

  function getDefaultUnitName() {
    return auth?.social_unit_name || ''
  }

  function validate(payload) {
    const errors = {}
    if (!payload.name.trim()) errors.name = 'Campo obrigatório.'
    if (!payload.unit_id) errors.unit_id = 'Campo obrigatório.'
    return errors
  }

  function openCreate() {
    setMode('form')
    setEditingId(null)
    setForm({ ...emptyForm, unit_id: getDefaultUnitId() })
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  async function openEdit(row) {
    try {
      const item = await api(`/locais/${row.id}`)
      setForm({
        name: item.name || '',
        unit_id: String(item.unit_id || getDefaultUnitId()),
      })
      setEditingId(item.id)
      setMode('form')
      setFieldErrors({})
      setError('')
      setMessage('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function onSave(event) {
    event.preventDefault()
    const normalized = {
      name: form.name.trim(),
      unit_id: form.unit_id || getDefaultUnitId(),
    }
    const errors = validate(normalized)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Revise os campos obrigatórios antes de salvar.')
      return
    }
    try {
      setLoading(true)
      const payload = {
        name: normalized.name,
        unit_id: Number(normalized.unit_id),
      }
      if (editingId) {
        await api(`/locais/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Local atualizado com sucesso.')
      } else {
        await api('/locais', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Local cadastrado com sucesso.')
      }
      setMode('list')
      setForm(emptyForm)
      setEditingId(null)
      setFieldErrors({})
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusão do local?')) return
    try {
      setLoading(true)
      await api(`/locais/${row.id}`, { method: 'DELETE' })
      setMessage('Local excluído com sucesso.')
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'form') {
    return (
      <section>
        <h2>{editingId ? 'Editar Local' : 'Cadastrar Local'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={onSave} className="card cadastro-form-card" noValidate>
          <div className="form-row form-row-2">
            <div className="field">
              <label>Local</label>
              <input
                value={form.name}
                maxLength={120}
                required
                disabled={loading}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <p className="error">{fieldErrors.name}</p>}
            </div>
            <div className="field">
              <label>Unidade Social</label>
              {canSelectUnit ? (
                <select
                  value={form.unit_id}
                  required
                  disabled={loading}
                  onChange={(event) => setForm((current) => ({ ...current, unit_id: event.target.value }))}
                  aria-invalid={Boolean(fieldErrors.unit_id)}
                >
                  <option value="">Selecione</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                </select>
              ) : (
                <input value={getDefaultUnitName()} disabled />
              )}
              {fieldErrors.unit_id && <p className="error">{fieldErrors.unit_id}</p>}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setMode('list')}>Cancelar</button>
            <button type="submit" disabled={loading}>Salvar</button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}
      <CadastroListView
        title="Local"
        columns={columns}
        rows={displayRows}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={openCreate}
        searchPlaceholder="Digite o local ou unidade social"
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6 }}>
            <ActionIconButton action="edit" label="Editar local" onClick={() => openEdit(row)} />
            <ActionIconButton action="delete" label="Excluir local" onClick={() => onDelete(row)} />
          </div>
        )}
      />
    </>
  )
}
