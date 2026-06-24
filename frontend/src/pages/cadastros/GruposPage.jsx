import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'

const emptyForm = { name: '', shift: '', initial_age: '', final_age: '' }
const shiftOptions = ['Manhã', 'Tarde']
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'shift', label: 'Turno' },
  { key: 'age_range', label: 'Faixa Etaria' },
]

export function GruposPage() {
  const auth = getAuth()
  const permissions = auth?.permissions || []
  const canRead = Boolean(auth?.is_admin) || permissions.includes('groups.read')
  const canWrite = Boolean(auth?.is_admin) || permissions.includes('groups.write')
  const canDelete = Boolean(auth?.is_admin) || permissions.includes('groups.delete')

  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
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
    window.addEventListener('grupos:list', showList)
    return () => window.removeEventListener('grupos:list', showList)
  }, [])

  async function loadRows() {
    if (!canRead) return
    try {
      const data = await api('/grupos')
      setRows(data)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { loadRows() }, [])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const data = rows.map((item) => ({
      ...item,
      age_range: `${item.initial_age} a ${item.final_age} anos`,
    }))
    if (!term) return data
    return data.filter((row) => String(row.name || '').toLowerCase().includes(term))
  }, [rows, search])

  function validate(payload) {
    const errors = {}
    if (!payload.name.trim()) errors.name = 'Campo obrigatório.'
    if (!payload.shift) errors.shift = 'Campo obrigatório.'
    if (payload.initial_age === '' || payload.initial_age === null) errors.initial_age = 'Campo obrigatório.'
    if (payload.final_age === '' || payload.final_age === null) errors.final_age = 'Campo obrigatório.'
    if (payload.initial_age !== '' && Number(payload.initial_age) < 0) errors.initial_age = 'Idade nao pode ser negativa.'
    if (payload.final_age !== '' && Number(payload.final_age) < 0) errors.final_age = 'Idade nao pode ser negativa.'
    if (
      payload.initial_age !== '' &&
      payload.final_age !== '' &&
      Number(payload.final_age) < Number(payload.initial_age)
    ) {
      errors.final_age = 'Idade Final deve ser maior ou igual a Idade Inicial.'
    }
    return errors
  }

  function openCreate() {
    setMode('form')
    setEditingId(null)
    setForm(emptyForm)
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  async function openEdit(row) {
    try {
      const item = await api(`/grupos/${row.id}`)
      setForm({
        name: item.name || '',
        shift: item.shift || '',
        initial_age: String(item.initial_age ?? ''),
        final_age: String(item.final_age ?? ''),
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

  async function onSave(e) {
    e.preventDefault()
    const normalized = {
      name: form.name.trim(),
      shift: form.shift,
      initial_age: form.initial_age === '' ? '' : Number(form.initial_age),
      final_age: form.final_age === '' ? '' : Number(form.final_age),
    }
    const errors = validate(normalized)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Revise os campos obrigatórios antes de salvar.')
      return
    }
    try {
      const payload = {
        name: normalized.name,
        shift: normalized.shift,
        initial_age: Number(normalized.initial_age),
        final_age: Number(normalized.final_age),
      }
      if (editingId) {
        await api(`/grupos/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Grupo atualizado com sucesso.')
      } else {
        await api('/grupos', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Grupo cadastrado com sucesso.')
      }
      setMode('list')
      setForm(emptyForm)
      setEditingId(null)
      setFieldErrors({})
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusao do grupo?')) return
    try {
      await api(`/grupos/${row.id}`, { method: 'DELETE' })
      setMessage('Grupo removido com sucesso.')
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!canRead) return <p className="error">Acesso negado.</p>

  if (mode === 'form') {
    return (
      <section>
        <h2>{editingId ? 'Editar Grupo' : 'Cadastrar Grupo'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={onSave} className="card" noValidate>
          <div className="form-row form-row-4">
            <div className="field">
              <label>Nome</label>
              <input
                value={form.name}
                maxLength={255}
                required
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <p className="error">{fieldErrors.name}</p>}
            </div>
            <div className="field">
              <label>Turno</label>
              <select
                value={form.shift}
                required
                onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value }))}
                aria-invalid={Boolean(fieldErrors.shift)}
              >
                <option value="">Selecione</option>
                {shiftOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {fieldErrors.shift && <p className="error">{fieldErrors.shift}</p>}
            </div>
            <div className="field">
              <label>Idade Inicial</label>
              <input
                type="number"
                min="0"
                required
                value={form.initial_age}
                onChange={(e) => setForm((prev) => ({ ...prev, initial_age: e.target.value }))}
                aria-invalid={Boolean(fieldErrors.initial_age)}
              />
              {fieldErrors.initial_age && <p className="error">{fieldErrors.initial_age}</p>}
            </div>
            <div className="field">
              <label>Idade Final</label>
              <input
                type="number"
                min="0"
                required
                value={form.final_age}
                onChange={(e) => setForm((prev) => ({ ...prev, final_age: e.target.value }))}
                aria-invalid={Boolean(fieldErrors.final_age)}
              />
              {fieldErrors.final_age && <p className="error">{fieldErrors.final_age}</p>}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setMode('list')}>Cancelar</button>
            <button type="submit">Salvar</button>
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
        title="Grupo"
        columns={columns}
        rows={filteredRows}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={canWrite ? openCreate : undefined}
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6 }}>
            {canWrite && <ActionIconButton action="edit" label="Editar grupo" onClick={() => openEdit(row)} />}
            {canDelete && <ActionIconButton action="delete" label="Excluir grupo" onClick={() => onDelete(row)} />}
          </div>
        )}
      />
    </>
  )
}
