import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'

const emptyForm = { description: '' }

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canAccessDonationCatalog(auth) {
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['secretaria executiva', 'secretaria administrativa', 'administrador do sistema'].includes(profile)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

const columns = [
  { key: 'sequence', label: 'Nº' },
  { key: 'description', label: 'Descrição' },
  { key: 'created_at_label', label: 'Data de Cadastro' },
]

export function CatalogoDoacoesPage() {
  const auth = getAuth()
  const canAccess = canAccessDonationCatalog(auth)
  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [readOnly, setReadOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setReadOnly(false)
      setForm(emptyForm)
      setFieldErrors({})
      setError('')
      setMessage('')
    }
    window.addEventListener('catalogo-doacoes:list', showList)
    return () => window.removeEventListener('catalogo-doacoes:list', showList)
  }, [])

  async function loadRows() {
    if (!canAccess) return
    try {
      setLoading(true)
      const data = await api(`/catalogo-doacoes?page=1&page_size=100&description=${encodeURIComponent(search.trim())}`)
      setRows(data.items || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRows() }, [search])

  const displayRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows
      .filter((row) => !term || String(row.description || '').toLowerCase().includes(term))
      .map((row, index) => ({
        ...row,
        sequence: index + 1,
        created_at_label: formatDateTime(row.created_at),
      }))
  }, [rows, search])

  function validate(payload) {
    const errors = {}
    if (!payload.description.trim()) errors.description = 'Informe a descrição.'
    if (payload.description.trim().length > 150) errors.description = 'Descrição deve ter no máximo 150 caracteres.'
    return errors
  }

  function openCreate() {
    setMode('form')
    setEditingId(null)
    setReadOnly(false)
    setForm(emptyForm)
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  async function openItem(row, nextMode = 'form') {
    try {
      setLoading(true)
      const item = await api(`/catalogo-doacoes/${row.id}`)
      setForm({ description: item.description || '' })
      setEditingId(item.id)
      setReadOnly(nextMode === 'view')
      setMode('form')
      setFieldErrors({})
      setError('')
      setMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    const payload = { description: form.description.trim() }
    const errors = validate(payload)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Revise os campos obrigatórios antes de salvar.')
      return
    }
    try {
      setLoading(true)
      if (editingId) {
        await api(`/catalogo-doacoes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Item de doação atualizado com sucesso.')
      } else {
        await api('/catalogo-doacoes', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Item de doação cadastrado com sucesso.')
      }
      setMode('list')
      setForm(emptyForm)
      setEditingId(null)
      setReadOnly(false)
      setFieldErrors({})
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteItem(row) {
    if (!window.confirm('Confirma a exclusão deste item do catálogo de doação?')) return
    try {
      setLoading(true)
      await api(`/catalogo-doacoes/${row.id}`, { method: 'DELETE' })
      setMessage('Item excluído com sucesso.')
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!canAccess) return <p className="error">Acesso negado.</p>

  if (mode === 'form') {
    return (
      <section>
        <h2>{readOnly ? 'Visualizar Catálogo de doação' : editingId ? 'Editar Catálogo de doação' : 'Cadastrar Catálogo de doação'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={save} className="card" noValidate>
          <div className="form-row">
            <div className="field donation-catalog-description-field">
              <label>Descrição</label>
              <input
                value={form.description}
                maxLength={150}
                required
                disabled={readOnly || loading}
                aria-invalid={Boolean(fieldErrors.description)}
                onChange={(event) => setForm({ description: event.target.value })}
              />
              {fieldErrors.description && <p className="error">{fieldErrors.description}</p>}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setMode('list'); setReadOnly(false); setEditingId(null); setError('') }}>Cancelar</button>
            {!readOnly && <button type="submit" disabled={loading}>Salvar</button>}
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
        title="Catálogo de doação"
        columns={columns}
        rows={displayRows}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={openCreate}
        cadastrarLabel="Cadastrar"
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <ActionIconButton action="view" label="Visualizar item" onClick={() => openItem(row, 'view')} />
            <ActionIconButton action="edit" label="Editar item" onClick={() => openItem(row, 'form')} />
            <ActionIconButton action="delete" label="Excluir item" onClick={() => deleteItem(row)} />
          </div>
        )}
      />
    </>
  )
}
