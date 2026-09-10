import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'
import { DatePickerBr } from '../../components/DatePickerBr'
import { brToIsoDate, isoToBrDate } from '../../utils/dateBr'

const LOCATIONS = ['Recepção', 'Sala de atendimento', 'Sala administrativa', 'Área externa', 'Banheiro', 'Cozinha', 'Corredor', 'Outro']
const SEVERITIES = ['Baixa', 'Média', 'Alta', 'Crítica']
const STATUSES = ['Aberta', 'Em acompanhamento', 'Resolvida', 'Cancelada']
const OCCURRENCE_SHIFTS = ['Manhã', 'Tarde']
const PERSON_TYPES = ['Usuário ACM', 'Funcionário', 'Visitante', 'Familiar', 'Pessoa externa', 'Pessoa não identificada']
const EXTERNAL_SERVICES = ['SAMU', 'Corpo de Bombeiros', 'Polícia Militar', 'Polícia Civil', 'Guarda Municipal', 'Defesa Civil', 'Hospital / Unidade de Saúde', 'Empresa de manutenção', 'Outro']

const emptyFilters = {
  data_inicio: '',
  data_fim: '',
  busca: '',
  local: '',
}

function localDateBrValue() {
  const date = new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

const emptyForm = {
  number: '',
  unit_name: '',
  creator_name: '',
  occurrence_date: localDateBrValue(),
  occurrence_shift: 'Manhã',
  location: '',
  location_details: '',
  category_id: '',
  severity: 'Baixa',
  description: '',
  actions_taken: '',
  status: 'Aberta',
  resolution: '',
  additional_notes: '',
  cancellation_reason: '',
  people: [],
  external_services: [],
  staff_ids: [],
  history: [],
}

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canAccessOccurrences(auth) {
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || [
    'administrador do sistema',
    'coordenador',
    'coordenadora',
    'tecnico',
    'tecnica',
    'educador',
    'educadora',
    'educador(a)',
    'secretaria executiva',
    'secretaria administrativa',
  ].includes(profile)
}

function formatDateBr(value) {
  return isoToBrDate(value) || '-'
}

function formatTime(value) {
  return String(value || '').slice(0, 5) || '-'
}

function truncate(value, size = 80) {
  const text = String(value || '')
  return text.length > size ? `${text.slice(0, size)}...` : text
}

function severityClass(value) {
  return `occurrence-badge severity-${normalizeProfile(value).replace(/\s+/g, '-')}`
}

function statusClass(value) {
  return `occurrence-badge status-${normalizeProfile(value).replace(/\s+/g, '-')}`
}

export function RegistroOcorrenciasPage() {
  const auth = getAuth()
  const canAccess = canAccessOccurrences(auth)
  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [readOnly, setReadOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [occurrenceTab, setOccurrenceTab] = useState('identification')

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setReadOnly(false)
      setForm({ ...emptyForm, occurrence_date: localDateBrValue() })
      setError('')
      setMessage('')
      setFieldErrors({})
      setOccurrenceTab('identification')
    }
    window.addEventListener('registro-ocorrencias:list', showList)
    return () => window.removeEventListener('registro-ocorrencias:list', showList)
  }, [])

  async function loadOptions() {
    const results = await Promise.allSettled([
      api('/ocorrencias/categorias'),
      api('/ocorrencias/usuarios'),
      api('/ocorrencias/colaboradores'),
    ])
    if (results[0].status === 'fulfilled') setCategories(results[0].value || [])
    if (results[1].status === 'fulfilled') setUsers(results[1].value || [])
    if (results[2].status === 'fulfilled') setCollaborators(results[2].value || [])
    const rejected = results.find((item) => item.status === 'rejected')
    if (rejected) throw rejected.reason
  }

  async function loadOccurrenceUsers() {
    const userRows = await api('/ocorrencias/usuarios')
    setUsers(userRows || [])
  }

  async function loadRows() {
    if (!canAccess) return
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: '1', page_size: '100' })
      Object.entries(filters).forEach(([key, value]) => {
        if (!String(value || '').trim()) return
        if (key === 'data_inicio' || key === 'data_fim') {
          const iso = brToIsoDate(value)
          if (iso) params.set(key, iso)
          return
        }
        params.set(key, String(value).trim())
      })
      const data = await api(`/ocorrencias?${params.toString()}`)
      setRows(data.items || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) return
    loadOptions().catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!canAccess || occurrenceTab !== 'people' || users.length > 0) return
    loadOccurrenceUsers().catch((err) => setError(err.message))
  }, [canAccess, occurrenceTab, users.length])

  useEffect(() => {
    loadRows()
  }, [filters])

  const displayRows = useMemo(() => rows.map((row) => ({
    ...row,
    occurrence_date_label: formatDateBr(row.occurrence_date),
    description_short: truncate(row.description),
    category_label: row.category_name || '-',
    creator_label: row.creator_name || '-',
    severity_label: <span className={severityClass(row.severity)}>{row.severity}</span>,
    status_label: <span className={statusClass(row.status)}>{row.status}</span>,
  })), [rows])

  const columns = [
    { key: 'number', label: 'Nº' },
    { key: 'occurrence_date_label', label: 'Data' },
    { key: 'category_label', label: 'Categoria' },
    { key: 'severity_label', label: 'Gravidade' },
    { key: 'description_short', label: 'Descrição' },
    { key: 'creator_label', label: 'Responsável' },
    { key: 'status_label', label: 'Status' },
  ]

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setFilters(emptyFilters)
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  function addPerson() {
    setForm((current) => ({
      ...current,
      people: [...current.people, { person_type: 'Usuário ACM', user_id: '', person_name: '', notes: '' }],
    }))
  }

  function updatePerson(index, key, value) {
    setForm((current) => {
      const people = current.people.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const next = { ...item, [key]: value }
        if (key === 'person_type') {
          next.user_id = ''
          next.person_name = ''
        }
        return next
      })
      return { ...current, people }
    })
  }

  function removePerson(index) {
    setForm((current) => ({ ...current, people: current.people.filter((_, itemIndex) => itemIndex !== index) }))
  }

  function addExternalService() {
    setForm((current) => ({
      ...current,
      external_services: [...current.external_services, { service_type: 'SAMU', service_name: '', called_at: '', protocol: '', notes: '' }],
    }))
  }

  function updateExternalService(index, key, value) {
    setForm((current) => ({
      ...current,
      external_services: current.external_services.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }))
  }

  function removeExternalService(index) {
    setForm((current) => ({ ...current, external_services: current.external_services.filter((_, itemIndex) => itemIndex !== index) }))
  }

  function toggleStaff(collaboratorId) {
    setForm((current) => {
      const id = Number(collaboratorId)
      const hasId = current.staff_ids.includes(id)
      return { ...current, staff_ids: hasId ? current.staff_ids.filter((item) => item !== id) : [...current.staff_ids, id] }
    })
  }

  function validate(payload) {
    const errors = {}
    if (!payload.occurrence_date) errors.occurrence_date = 'Informe a data da ocorrência.'
    if (!payload.occurrence_shift) errors.occurrence_shift = 'Informe o turno.'
    if (!payload.location) errors.location = 'Informe o local.'
    if (payload.location === 'Outro' && !payload.location_details) errors.location_details = 'Informe o local.'
    if (!payload.category_id) errors.category_id = 'Informe a categoria.'
    if (!payload.description) errors.description = 'Informe a descrição da ocorrência.'
    if (payload.status === 'Resolvida' && !payload.resolution) errors.resolution = 'Informe o desfecho/resolução.'
    if (payload.status === 'Cancelada' && !payload.cancellation_reason) errors.cancellation_reason = 'Informe o motivo do cancelamento.'
    return errors
  }

  function buildPayload() {
    return {
      occurrence_date: brToIsoDate(form.occurrence_date),
      occurrence_shift: form.occurrence_shift,
      location: form.location,
      location_details: form.location === 'Outro' ? form.location_details.trim() : null,
      category_id: Number(form.category_id),
      severity: form.severity,
      description: form.description.trim(),
      actions_taken: form.actions_taken.trim() || null,
      status: form.status,
      resolution: form.status === 'Resolvida' ? form.resolution.trim() : null,
      additional_notes: form.additional_notes.trim() || null,
      cancellation_reason: form.status === 'Cancelada' ? form.cancellation_reason.trim() : null,
      people: form.people.map((item) => ({
        person_type: item.person_type,
        user_id: ['Usuário ACM', 'Familiar'].includes(item.person_type) && item.user_id ? Number(item.user_id) : null,
        person_name: item.person_type === 'Usuário ACM' ? null : item.person_name.trim() || null,
        notes: item.notes.trim() || null,
      })),
      external_services: form.external_services.map((item) => ({
        service_type: item.service_type,
        service_name: item.service_type === 'Outro' ? item.service_name.trim() || null : null,
        called_at: item.called_at || null,
        protocol: item.protocol.trim() || null,
        notes: item.notes.trim() || null,
      })),
      staff_ids: form.staff_ids,
    }
  }

  function openCreate() {
    setMode('form')
    setEditingId(null)
    setReadOnly(false)
    setForm({ ...emptyForm, occurrence_date: localDateBrValue() })
    setFieldErrors({})
    setError('')
    setMessage('')
    setOccurrenceTab('identification')
  }

  async function openItem(row, nextMode = 'form') {
    try {
      setLoading(true)
      const item = await api(`/ocorrencias/${row.id}`)
      setForm({
        number: item.number || '',
        unit_name: item.unit_name || '',
        creator_name: item.creator_name || '',
        occurrence_date: isoToBrDate(item.occurrence_date) || localDateBrValue(),
        occurrence_shift: item.occurrence_shift || 'Manhã',
        location: item.location || '',
        location_details: item.location_details || '',
        category_id: String(item.category_id || ''),
        severity: item.severity || 'Baixa',
        description: item.description || '',
        actions_taken: item.actions_taken || '',
        status: item.status || 'Aberta',
        resolution: item.resolution || '',
        additional_notes: item.additional_notes || '',
        cancellation_reason: item.cancellation_reason || '',
        people: (item.people || []).map((person) => ({
          person_type: person.person_type,
          user_id: person.user_id ? String(person.user_id) : '',
          person_name: person.person_name || '',
          notes: person.notes || '',
        })),
        external_services: (item.external_services || []).map((service) => ({
          service_type: service.service_type,
          service_name: service.service_name || '',
          called_at: formatTime(service.called_at),
          protocol: service.protocol || '',
          notes: service.notes || '',
        })),
        staff_ids: (item.staff || []).map((staff) => Number(staff.collaborator_id)),
        history: item.history || [],
      })
      setEditingId(item.id)
      setReadOnly(nextMode === 'view')
      setMode('form')
      setError('')
      setFieldErrors({})
      setOccurrenceTab('identification')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    const payload = buildPayload()
    const errors = validate(payload)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Revise os campos obrigatórios antes de salvar.')
      return
    }
    try {
      setLoading(true)
      if (editingId) {
        await api(`/ocorrencias/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Ocorrência atualizada com sucesso.')
      } else {
        await api('/ocorrencias', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Ocorrência registrada com sucesso.')
      }
      setMode('list')
      setEditingId(null)
      setReadOnly(false)
      setForm({ ...emptyForm, occurrence_date: localDateBrValue() })
      setError('')
      setOccurrenceTab('identification')
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
        <h2>{readOnly ? 'Visualizar Ocorrência' : editingId ? 'Editar Ocorrência' : 'Registrar Ocorrência'}</h2>
        {error && <p className="error">{error}</p>}
        <form className="card occurrence-form" onSubmit={save} noValidate>
          <div className="tabs tabs-highlight occurrence-top-tabs">
            <button type="button" className={`tab-btn tab-highlight-btn ${occurrenceTab === 'identification' ? 'active' : ''}`} onClick={() => setOccurrenceTab('identification')}>
              IDENTIFICAÇÃO
            </button>
            <button type="button" className={`tab-btn tab-highlight-btn ${occurrenceTab === 'people' ? 'active' : ''}`} onClick={() => setOccurrenceTab('people')}>
              PESSOAS ENVOLVIDAS
            </button>
            <button type="button" className={`tab-btn tab-highlight-btn ${occurrenceTab === 'services' ? 'active' : ''}`} onClick={() => setOccurrenceTab('services')}>
              ACIONAMENTOS EXTERNOS
            </button>
          </div>
          {occurrenceTab === 'identification' && (
            <>
          <div className="occurrence-section">
            <h3>Identificação</h3>
            {readOnly && (
              <div className="occurrence-readonly-meta">
                <span>Número: <strong>{form.number || '-'}</strong></span>
                <span>Unidade: <strong>{form.unit_name || '-'}</strong></span>
                <span>Responsável: <strong>{form.creator_name || '-'}</strong></span>
              </div>
            )}
            <div className="form-row occurrence-identification-grid">
              <div className="field">
                <DatePickerBr label="DATA DA OCORRÊNCIA" value={form.occurrence_date} onChange={(value) => updateForm('occurrence_date', value)} disabled={readOnly || loading} />
                {fieldErrors.occurrence_date && <p className="error">{fieldErrors.occurrence_date}</p>}
              </div>
              <div className="field">
                <label>TURNO</label>
                <select value={form.occurrence_shift} disabled={readOnly || loading} onChange={(event) => updateForm('occurrence_shift', event.target.value)}>
                  {OCCURRENCE_SHIFTS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {fieldErrors.occurrence_shift && <p className="error">{fieldErrors.occurrence_shift}</p>}
              </div>
              <div className="field">
                <label>CATEGORIA</label>
                <select value={form.category_id} disabled={readOnly || loading} onChange={(event) => updateForm('category_id', event.target.value)}>
                  <option value="">Selecione</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                {fieldErrors.category_id && <p className="error">{fieldErrors.category_id}</p>}
              </div>
              <div className="field">
                <label>GRAVIDADE</label>
                <select value={form.severity} disabled={readOnly || loading} onChange={(event) => updateForm('severity', event.target.value)}>
                  {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="field">
                <label>LOCAL</label>
                <select value={form.location} disabled={readOnly || loading} onChange={(event) => updateForm('location', event.target.value)}>
                  <option value="">Selecione</option>
                  {LOCATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {fieldErrors.location && <p className="error">{fieldErrors.location}</p>}
              </div>
              <div className="field occurrence-detail-field">
                <label>DETALHE DO LOCAL</label>
                <input value={form.location_details} maxLength={150} disabled={readOnly || loading || form.location !== 'Outro'} onChange={(event) => updateForm('location_details', event.target.value)} />
                {fieldErrors.location_details && <p className="error">{fieldErrors.location_details}</p>}
              </div>
              <div className="field">
                <label>STATUS</label>
                <select value={form.status} disabled={readOnly || loading} onChange={(event) => updateForm('status', event.target.value)}>
                  {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="occurrence-section occurrence-section-description">
            <div className="occurrence-subsection-title">
              <h3>Descrição e providências</h3>
              <span>Registre o que aconteceu, as providências adotadas e observações relevantes.</span>
            </div>
            <div className="occurrence-description-layout">
              <div className="field">
                <label>DESCRIÇÃO DA OCORRÊNCIA</label>
                <textarea className="occurrence-main-textarea" rows={6} value={form.description} disabled={readOnly || loading} onChange={(event) => updateForm('description', event.target.value)} />
                {fieldErrors.description && <p className="error">{fieldErrors.description}</p>}
              </div>
              <div className="field">
                <label>PROVIDÊNCIAS TOMADAS</label>
                <textarea rows={4} value={form.actions_taken} disabled={readOnly || loading} onChange={(event) => updateForm('actions_taken', event.target.value)} />
              </div>
              <div className="field">
                <label>OBSERVAÇÕES ADICIONAIS</label>
                <textarea rows={4} value={form.additional_notes} disabled={readOnly || loading} onChange={(event) => updateForm('additional_notes', event.target.value)} />
              </div>
            </div>
            {form.status === 'Resolvida' && (
              <div className="field">
                <label>DESFECHO / RESOLUÇÃO</label>
                <textarea rows={3} value={form.resolution} disabled={readOnly || loading} onChange={(event) => updateForm('resolution', event.target.value)} />
                {fieldErrors.resolution && <p className="error">{fieldErrors.resolution}</p>}
              </div>
            )}
            {form.status === 'Cancelada' && (
              <div className="field">
                <label>MOTIVO DO CANCELAMENTO</label>
                <textarea rows={3} value={form.cancellation_reason} disabled={readOnly || loading} onChange={(event) => updateForm('cancellation_reason', event.target.value)} />
                {fieldErrors.cancellation_reason && <p className="error">{fieldErrors.cancellation_reason}</p>}
              </div>
            )}
          </div>
            </>
          )}

          {occurrenceTab === 'people' && (
            <div className="occurrence-section">
              <div className="occurrence-section-header">
                <h3>Pessoas envolvidas</h3>
                {!readOnly && <button type="button" className="btn btn-ghost" onClick={addPerson}>Adicionar pessoa</button>}
              </div>
              <div className="occurrence-tab-panel">
                {form.people.length === 0 && <p className="empty-state">Nenhuma pessoa envolvida informada.</p>}
                {form.people.map((person, index) => (
                  <div className="occurrence-repeat-card" key={`person-${index}`}>
                    <div className="form-row occurrence-person-grid">
                      <div className="field">
                        <label>TIPO</label>
                        <select value={person.person_type} disabled={readOnly || loading} onChange={(event) => updatePerson(index, 'person_type', event.target.value)}>
                          {PERSON_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>USUÁRIO ACM</label>
                        <select value={person.user_id} disabled={readOnly || loading || !['Usuário ACM', 'Familiar'].includes(person.person_type)} onChange={(event) => updatePerson(index, 'user_id', event.target.value)}>
                          <option value="">Selecione</option>
                          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>NOME</label>
                        <input value={person.person_name} maxLength={200} disabled={readOnly || loading || ['Usuário ACM', 'Pessoa não identificada'].includes(person.person_type)} onChange={(event) => updatePerson(index, 'person_name', event.target.value)} />
                      </div>
                      <div className="field occurrence-full-row">
                        <label>OBSERVAÇÃO</label>
                        <textarea rows={3} value={person.notes} disabled={readOnly || loading} onChange={(event) => updatePerson(index, 'notes', event.target.value)} />
                      </div>
                    </div>
                    {!readOnly && <button type="button" className="btn btn-ghost" onClick={() => removePerson(index)}>Remover pessoa</button>}
                  </div>
                ))}
              </div>
            </div>
            )}

          {occurrenceTab === 'services' && (
            <div className="occurrence-section">
              <div className="occurrence-section-header">
                <h3>Acionamentos externos</h3>
                {!readOnly && <button type="button" className="btn btn-ghost" onClick={addExternalService}>Adicionar acionamento</button>}
              </div>
              <div className="occurrence-tab-panel">
                {form.external_services.length === 0 && <p className="empty-state">Nenhum serviço externo acionado.</p>}
                {form.external_services.map((service, index) => (
                  <div className="occurrence-repeat-card" key={`service-${index}`}>
                    <div className="form-row form-row-4">
                      <div className="field">
                        <label>SERVIÇO</label>
                        <select value={service.service_type} disabled={readOnly || loading} onChange={(event) => updateExternalService(index, 'service_type', event.target.value)}>
                          {EXTERNAL_SERVICES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>NOME DO SERVIÇO</label>
                        <input value={service.service_name} disabled={readOnly || loading || service.service_type !== 'Outro'} onChange={(event) => updateExternalService(index, 'service_name', event.target.value)} />
                      </div>
                      <div className="field">
                        <label>HORÁRIO</label>
                        <input type="time" value={service.called_at} disabled={readOnly || loading} onChange={(event) => updateExternalService(index, 'called_at', event.target.value)} />
                      </div>
                      <div className="field">
                        <label>PROTOCOLO</label>
                        <input value={service.protocol} maxLength={80} disabled={readOnly || loading} onChange={(event) => updateExternalService(index, 'protocol', event.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label>OBSERVAÇÃO</label>
                      <input value={service.notes} disabled={readOnly || loading} onChange={(event) => updateExternalService(index, 'notes', event.target.value)} />
                    </div>
                    {!readOnly && <button type="button" className="btn btn-ghost" onClick={() => removeExternalService(index)}>Remover acionamento</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {occurrenceTab === 'identification' && (
            <>
          <div className="occurrence-section">
            <h3>Responsáveis pelo atendimento</h3>
            <p className="occurrence-helper-text">
              Selecione manualmente os colaboradores que acompanharam ou trataram esta ocorrência. O registro de criação continua sendo gravado automaticamente pelo sistema.
            </p>
            <div className="occurrence-staff-grid">
              {collaborators.map((collaborator) => (
                <label className="occurrence-staff-option" key={collaborator.id}>
                  <input type="checkbox" checked={form.staff_ids.includes(Number(collaborator.id))} disabled={readOnly || loading} onChange={() => toggleStaff(collaborator.id)} />
                  <span>{collaborator.name}</span>
                </label>
              ))}
            </div>
          </div>

          {readOnly && editingId && (
            <div className="occurrence-section">
              <h3>Histórico</h3>
              {(form.history || []).length === 0 && <p className="empty-state">Nenhum histórico registrado.</p>}
              {(form.history || []).map((item) => (
                <div className="occurrence-history-item" key={item.id}>
                  <strong>{item.action}</strong>
                  <span>{item.description}</span>
                  <small>{item.performer_name || 'Sistema'} · {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-'}</small>
                </div>
              ))}
            </div>
          )}
            </>
          )}

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
        title="Ocorrências"
        columns={columns}
        rows={displayRows}
        searchTerm={filters.busca}
        onSearchChange={(value) => updateFilter('busca', value)}
        onCadastrar={openCreate}
        searchPlaceholder="Digite número, categoria ou gravidade"
        cadastrarLabel="Registrar ocorrência"
        renderAfterSearch={() => (
          <>
            <div className="search-filter-field compact-filter occurrence-date-filter">
              <DatePickerBr label="DATA INICIAL" value={filters.data_inicio} onChange={(value) => updateFilter('data_inicio', value)} />
            </div>
            <div className="search-filter-field compact-filter occurrence-date-filter">
              <DatePickerBr label="DATA FINAL" value={filters.data_fim} onChange={(value) => updateFilter('data_fim', value)} />
            </div>
            <div className="search-filter-field compact-filter">
              <label>LOCAL</label>
              <select className="occurrence-local-filter" value={filters.local} onChange={(event) => updateFilter('local', event.target.value)}>
                <option value="">Todos</option>
                {LOCATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-ghost compact-clear-button" onClick={clearFilters}>Limpar</button>
          </>
        )}
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <ActionIconButton action="view" label="Visualizar ocorrência" onClick={() => openItem(row, 'view')} />
            <ActionIconButton action="edit" label="Editar ocorrência" onClick={() => openItem(row, 'form')} />
          </div>
        )}
      />
    </>
  )
}
