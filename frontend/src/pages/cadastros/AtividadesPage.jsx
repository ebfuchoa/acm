import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'

const initialForm = { name: '', group_ids: [], dias_semana: [], description: '' }
const weekdays = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
]
const weekdayLabels = Object.fromEntries(weekdays.map((item) => [item.value, item.label]))
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'group_name', label: 'Grupo' },
  { key: 'dias_semana_label', label: 'Dias da Semana' },
  { key: 'description', label: 'Descrição' },
]

export function AtividadesPage() {
  const auth = getAuth()
  const permissions = auth?.permissions || []
  const canWrite = Boolean(auth?.is_admin) || permissions.includes('activities.write')
  const canDelete = Boolean(auth?.is_admin) || permissions.includes('activities.delete')
  const canRead = Boolean(auth?.is_admin) || permissions.includes('activities.read')

  const [mode, setMode] = useState('list')
  const [editingId, setEditingId] = useState(null)
  const [activities, setActivities] = useState([])
  const [groups, setGroups] = useState([])
  const [form, setForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
  const groupDropdownRef = useRef(null)

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setForm(initialForm)
      setFieldErrors({})
      setError('')
      setMessage('')
      setIsGroupDropdownOpen(false)
    }
    window.addEventListener('atividades:list', showList)
    return () => window.removeEventListener('atividades:list', showList)
  }, [])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!groupDropdownRef.current) return
      if (!groupDropdownRef.current.contains(event.target)) {
        setIsGroupDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function loadRows() {
    if (!canRead) return
    try {
      const [rows, groupsRows] = await Promise.all([api('/atividades'), api('/grupos')])
      const groupsById = Object.fromEntries(groupsRows.map((g) => [g.id, g.name]))
      setGroups(groupsRows)
      setActivities(rows.map((row) => {
        const ids = Array.isArray(row.group_ids) && row.group_ids.length > 0
          ? row.group_ids
          : (row.group_id ? [row.group_id] : [])
        const groupNames = ids.map((id) => groupsById[id]).filter(Boolean)
        const days = Array.isArray(row.dias_semana) ? row.dias_semana : []
        return {
          ...row,
          group_name: groupNames.length > 0 ? groupNames.join(', ') : '-',
          dias_semana_label: days.length > 0 ? days.map((day) => weekdayLabels[day] || day).join(', ') : '-',
        }
      }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return activities
    return activities.filter((row) => {
      const name = String(row.name || '').toLowerCase()
      const groupName = String(row.group_name || '').toLowerCase()
      const description = String(row.description || '').toLowerCase()
      return name.includes(term) || groupName.includes(term) || description.includes(term)
    })
  }, [activities, search])

  function openCreate() {
    setForm(initialForm)
    setEditingId(null)
    setFieldErrors({})
    setMode('form')
    setError('')
    setMessage('')
    setIsGroupDropdownOpen(false)
  }

  async function openEdit(row) {
    try {
      const data = await api(`/atividades/${row.id}`)
      const ids = Array.isArray(data.group_ids) && data.group_ids.length > 0
        ? data.group_ids
        : (data.group_id ? [data.group_id] : [])
      setForm({
        name: data.name || '',
        group_ids: ids.map((id) => String(id)),
        dias_semana: Array.isArray(data.dias_semana) ? data.dias_semana : [],
        description: data.description || '',
      })
      setEditingId(row.id)
      setFieldErrors({})
      setMode('form')
      setError('')
      setMessage('')
      setIsGroupDropdownOpen(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function onSave(e) {
    e.preventDefault()
    setError('')
    const payload = {
      name: form.name.trim(),
      group_ids: form.group_ids.map((id) => Number(id)),
      dias_semana: form.dias_semana,
      description: form.description.trim() || null,
    }
    const nextFieldErrors = {}
    if (!payload.name) nextFieldErrors.name = 'Campo obrigatorio.'
    if (!form.group_ids || form.group_ids.length === 0) nextFieldErrors.group_ids = 'Campo obrigatorio.'
    if (!form.dias_semana || form.dias_semana.length === 0) nextFieldErrors.dias_semana = 'Selecione pelo menos um dia da semana.'
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Revise os campos obrigatorios antes de salvar.')
      return
    }
    setFieldErrors({})
    try {
      if (editingId) {
        await api(`/atividades/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Atividade atualizada com sucesso.')
      } else {
        await api('/atividades', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Cadastro realizado com sucesso.')
      }
      setMode('list')
      setForm(initialForm)
      setEditingId(null)
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusao da atividade?')) return
    try {
      await api(`/atividades/${row.id}`, { method: 'DELETE' })
      setMessage('Atividade removida com sucesso.')
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleWeekday(value) {
    const checked = form.dias_semana.includes(value)
    const dias_semana = checked
      ? form.dias_semana.filter((item) => item !== value)
      : [...form.dias_semana, value]
    setForm({ ...form, dias_semana })
  }

  if (!canRead) {
    return <p className="error">Acesso negado.</p>
  }

  if (mode === 'form') {
    const selectedGroupNames = groups
      .filter((group) => form.group_ids.includes(String(group.id)))
      .map((group) => group.name)
      .join(', ')
    const groupDropdownLabel = selectedGroupNames || 'Selecione'

    return (
      <section>
        <h2>{editingId ? 'Editar Atividade' : 'Cadastrar Atividade'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={onSave} className="card" noValidate>
          <div className="form-row" style={{ gridTemplateColumns: '1.8fr 0.8fr' }}>
            <div className="field">
              <label>Nome <span className="required-mark">*</span></label>
              <input
                value={form.name}
                maxLength={255}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.name
                      return next
                    })
                  }
                }}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <p className="error">{fieldErrors.name}</p>}
            </div>
            <div className="field">
              <label>Grupo <span className="required-mark">*</span></label>
              <div ref={groupDropdownRef} style={{ position: 'relative' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsGroupDropdownOpen((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setIsGroupDropdownOpen((prev) => !prev)
                    }
                  }}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    textAlign: 'left',
                    border: '1px solid var(--line-strong)',
                    background: '#fafbfc',
                    color: 'var(--text)',
                    padding: '10px 12px',
                    minHeight: 42,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  aria-expanded={isGroupDropdownOpen}
                >
                  {groupDropdownLabel}
                </div>
                {isGroupDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      zIndex: 20,
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      maxHeight: 220,
                      overflowY: 'auto',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    {groups.map((group) => {
                      const value = String(group.id)
                      const checked = form.group_ids.includes(value)
                      return (
                        <label
                          key={group.id}
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            marginBottom: 6,
                            width: '100%',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            style={{ width: 16, height: 16, margin: 0, flex: '0 0 auto' }}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.group_ids, value]
                                : form.group_ids.filter((id) => id !== value)
                              setForm({ ...form, group_ids: next })
                              if (fieldErrors.group_ids) {
                                setFieldErrors((prev) => {
                                  const clear = { ...prev }
                                  delete clear.group_ids
                                  return clear
                                })
                              }
                            }}
                          />
                          <span style={{ lineHeight: 1.2 }}>{group.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              {fieldErrors.group_ids && <p className="error">{fieldErrors.group_ids}</p>}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>Dias da Semana <span className="required-mark">*</span></label>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: '#f3f4f6',
                border: 'none',
              }}
            >
              {weekdays.map((day) => (
                <label
                  key={day.value}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 999,
                    padding: '8px 12px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.dias_semana.includes(day.value)}
                    onChange={() => toggleWeekday(day.value)}
                    style={{ width: 16, height: 16, margin: 0 }}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.dias_semana && <p className="error">{fieldErrors.dias_semana}</p>}
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea
              value={form.description}
              rows={6}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
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
        title="Atividade"
        columns={columns}
        rows={filteredRows}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={openCreate}
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6 }}>
            {canWrite && <ActionIconButton action="edit" label="Editar atividade" onClick={() => openEdit(row)} />}
            {canDelete && <ActionIconButton action="delete" label="Excluir atividade" onClick={() => onDelete(row)} />}
          </div>
        )}
      />
    </>
  )
}
