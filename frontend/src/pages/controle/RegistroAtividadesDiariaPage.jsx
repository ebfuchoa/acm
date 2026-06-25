import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'
import { DatePickerBr } from '../../components/DatePickerBr'
import { brToIsoDate, isoToBrDate } from '../../utils/dateBr'

const DESCRIPTION_LIMIT = 1000

const PERIODS = {
  Manhã: [
    { value: '1', label: '1º Período', time: '08:15 - 09:40' },
    { value: '2', label: '2º Período', time: '10:00 - 11:30' },
  ],
  Tarde: [
    { value: '1', label: '1º Período', time: '13:15 - 14:40' },
    { value: '2', label: '2º Período', time: '15:10 - 16:30' },
  ],
}

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const columns = [
  { key: 'sequence', label: 'Nº' },
  { key: 'activity_date_label', label: 'Data' },
  { key: 'shift', label: 'Turno' },
  { key: 'period_label', label: 'Período' },
  { key: 'activity_name', label: 'Atividade' },
  { key: 'group_name', label: 'Grupo' },
  { key: 'educator_name', label: 'Educadora' },
]

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canAccessDailyActivity(auth) {
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['educador', 'educadora', 'administrador do sistema'].includes(profile)
}

function todayBr() {
  const date = new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

function weekdayLabel(value) {
  const iso = brToIsoDate(value)
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return WEEKDAYS[date.getDay()]
}

function selectedPeriodInfo(shift, period) {
  return (PERIODS[shift] || []).find((item) => item.value === period) || null
}

function emptyForm() {
  return {
    activity_date: todayBr(),
    shift: 'Manhã',
    period: '1',
    activity_id: '',
    group_id: '',
    description: '',
  }
}

export function RegistroAtividadesDiariaPage() {
  const auth = getAuth()
  const canAccess = canAccessDailyActivity(auth)
  const [mode, setMode] = useState('list')
  const [editingId, setEditingId] = useState(null)
  const [readOnly, setReadOnly] = useState(false)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const weekday = weekdayLabel(form.activity_date)
  const periodInfo = selectedPeriodInfo(form.shift, form.period)
  const selectedActivity = useMemo(
    () => activities.find((activity) => String(activity.id) === String(form.activity_id)),
    [activities, form.activity_id],
  )
  const activityGroups = selectedActivity?.groups || []
  const displayRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filterIsoDate = brToIsoDate(dateFilter)
    return rows
      .map((row, index) => ({
        ...row,
        sequence: index + 1,
        activity_date_label: isoToBrDate(row.activity_date),
        period_label: `${row.period}º Período (${row.start_time} - ${row.end_time})`,
      }))
      .filter((row) => {
        if (filterIsoDate && row.activity_date !== filterIsoDate) return false
        if (!term) return true
        return columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(term))
      })
  }, [rows, search, dateFilter])

  async function loadRows() {
    if (!canAccess) return
    try {
      setLoading(true)
      const data = await api('/registro-atividades-diarias')
      setRows(data || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadActivities(nextDate = form.activity_date) {
    const iso = brToIsoDate(nextDate)
    if (!iso || !canAccess) {
      setActivities([])
      return
    }
    try {
      setLoading(true)
      const data = await api(`/registro-atividades-diarias/atividades?data_atividade=${encodeURIComponent(iso)}`)
      setActivities(data || [])
      setError('')
    } catch (err) {
      setActivities([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setReadOnly(false)
      setForm(emptyForm())
      setFieldErrors({})
      setError('')
    }
    window.addEventListener('registro-atividades-diaria:list', showList)
    return () => window.removeEventListener('registro-atividades-diaria:list', showList)
  }, [])

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'activity_date') {
        next.activity_id = ''
        next.group_id = ''
      }
      if (key === 'activity_id') next.group_id = ''
      if (key === 'shift') next.period = '1'
      if (key === 'description') next.description = value.slice(0, DESCRIPTION_LIMIT)
      return next
    })
    if (key === 'activity_date') loadActivities(value)
    if (fieldErrors[key] || key === 'activity_id' || key === 'activity_date') {
      setFieldErrors((current) => {
        const clean = { ...current }
        delete clean[key]
        if (key === 'activity_id' || key === 'activity_date') delete clean.group_id
        return clean
      })
    }
  }

  function validate() {
    const errors = {}
    if (!brToIsoDate(form.activity_date)) errors.activity_date = 'Informe uma data válida.'
    if (!form.shift) errors.shift = 'Informe o turno.'
    if (!form.period) errors.period = 'Informe o período.'
    if (!form.activity_id) errors.activity_id = 'Selecione a atividade realizada.'
    if (!form.group_id) errors.group_id = 'Selecione o grupo.'
    if (form.description.length > DESCRIPTION_LIMIT) errors.description = `Descrição deve ter no máximo ${DESCRIPTION_LIMIT} caracteres.`
    return errors
  }

  function cancel() {
    setForm(emptyForm())
    setFieldErrors({})
    setError('')
    setMessage('')
    setEditingId(null)
    setReadOnly(false)
    setMode('list')
    loadActivities(todayBr())
  }

  function openCreate() {
    setForm(emptyForm())
    setFieldErrors({})
    setError('')
    setMessage('')
    setEditingId(null)
    setReadOnly(false)
    setMode('form')
    loadActivities(todayBr())
  }

  async function openItem(row, nextMode = 'form') {
    try {
      setLoading(true)
      const item = await api(`/registro-atividades-diarias/${row.id}`)
      const dateBr = isoToBrDate(item.activity_date)
      await loadActivities(dateBr)
      setForm({
        activity_date: dateBr,
        shift: item.shift || 'Manhã',
        period: item.period || '1',
        activity_id: String(item.activity_id || ''),
        group_id: String(item.group_id || ''),
        description: item.description || '',
      })
      setEditingId(item.id)
      setReadOnly(nextMode === 'view')
      setFieldErrors({})
      setError('')
      setMessage('')
      setMode('form')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteItem(row) {
    if (!window.confirm('Confirma a exclusão deste registro de atividade diária?')) return
    try {
      setLoading(true)
      await api(`/registro-atividades-diarias/${row.id}`, { method: 'DELETE' })
      setMessage('Registro de atividade excluído com sucesso.')
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Revise os campos obrigatórios antes de salvar.')
      return
    }
    try {
      setSaving(true)
      await api(editingId ? `/registro-atividades-diarias/${editingId}` : '/registro-atividades-diarias', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          activity_date: brToIsoDate(form.activity_date),
          shift: form.shift,
          period: form.period,
          activity_id: Number(form.activity_id),
          group_id: Number(form.group_id),
          description: form.description.trim() || null,
        }),
      })
      setMessage(editingId ? 'Registro da atividade atualizado com sucesso.' : 'Registro da atividade salvo com sucesso.')
      setError('')
      setFieldErrors({})
      setForm(emptyForm())
      setEditingId(null)
      setReadOnly(false)
      setMode('list')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!canAccess) {
    return <section className="card"><p className="error">Acesso permitido apenas para Educador e Administrador.</p></section>
  }

  if (mode === 'list') {
    return (
      <>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error">{error}</p>}
        <CadastroListView
          title="Registro de Atividades Diária"
          columns={columns}
          rows={displayRows}
          searchTerm={search}
          onSearchChange={setSearch}
          onCadastrar={openCreate}
          cadastrarLabel="Registrar atividade diária"
          emptyMessage="Nenhum registro de atividade diária encontrado."
          renderAfterSearch={() => (
            <div className="search-filter-field registro-atividade-date-filter">
              <DatePickerBr label="DATA" value={dateFilter} onChange={setDateFilter} />
            </div>
          )}
          renderActions={(row) => (
            <div style={{ display: 'flex', gap: 6 }}>
              <ActionIconButton action="view" label="Visualizar registro" onClick={() => openItem(row, 'view')} />
              <ActionIconButton action="edit" label="Editar registro" onClick={() => openItem(row, 'form')} />
              <ActionIconButton action="delete" label="Excluir registro" onClick={() => deleteItem(row)} />
            </div>
          )}
        />
      </>
    )
  }

  return (
    <section className="daily-activity-page">
      <div className="daily-activity-header">
        <h2>{readOnly ? 'Visualizar Registro de Atividade Diária' : editingId ? 'Editar Registro de Atividade Diária' : 'Registro de Atividades Diária'}</h2>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}

      <form onSubmit={save} noValidate>
        <div className="daily-activity-summary card">
          <div className="daily-summary-item">
            <span>Data</span>
            <strong>{form.activity_date || '-'}</strong>
            <small>{weekday || 'Selecione uma data'}</small>
          </div>
          <div className="daily-summary-item">
            <span>Turno</span>
            <strong>{form.shift || '-'}</strong>
          </div>
          <div className="daily-summary-item">
            <span>Período</span>
            <strong>{periodInfo ? `${periodInfo.label} (${periodInfo.time})` : '-'}</strong>
          </div>
          <div className="daily-summary-item">
            <span>Educadora responsável</span>
            <strong>{auth?.user_name || 'Usuário logado'}</strong>
            <small>{auth?.social_unit_name || auth?.profile || ''}</small>
          </div>
        </div>

        <div className="card daily-activity-form-card">
          <div className="form-row form-row-3">
            <div className="field">
              <DatePickerBr label="Data" value={form.activity_date} onChange={(value) => updateField('activity_date', value)} required disabled={loading || saving || readOnly} />
              {fieldErrors.activity_date && <p className="error">{fieldErrors.activity_date}</p>}
            </div>
            <div className="field">
              <label>Turno</label>
              <select value={form.shift} onChange={(event) => updateField('shift', event.target.value)} disabled={saving || readOnly} required>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
              </select>
              {fieldErrors.shift && <p className="error">{fieldErrors.shift}</p>}
            </div>
            <div className="field">
              <label>Período</label>
              <select value={form.period} onChange={(event) => updateField('period', event.target.value)} disabled={saving || readOnly} required>
                {(PERIODS[form.shift] || []).map((item) => (
                  <option key={item.value} value={item.value}>{item.label} ({item.time})</option>
                ))}
              </select>
              {fieldErrors.period && <p className="error">{fieldErrors.period}</p>}
            </div>
          </div>

          <div className="form-row daily-activity-selection-row">
            <div className="field">
              <label>Atividade realizada</label>
              <select value={form.activity_id} onChange={(event) => updateField('activity_id', event.target.value)} disabled={loading || saving || readOnly || activities.length === 0} required>
                <option value="">{loading ? 'Carregando atividades...' : 'Selecione a atividade'}</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>{activity.name}</option>
                ))}
              </select>
              {fieldErrors.activity_id && <p className="error">{fieldErrors.activity_id}</p>}
              {!loading && activities.length === 0 && <p className="helper-text">Não há atividades programadas para o dia selecionado.</p>}
            </div>

            <div className="field">
              <label>Grupo</label>
              <select value={form.group_id} onChange={(event) => updateField('group_id', event.target.value)} disabled={saving || readOnly || !form.activity_id || activityGroups.length === 0} required>
                <option value="">{form.activity_id ? 'Selecione o grupo' : 'Selecione uma atividade primeiro'}</option>
                {activityGroups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              {fieldErrors.group_id && <p className="error">{fieldErrors.group_id}</p>}
              {form.activity_id && activityGroups.length === 0 && <p className="helper-text">Não há grupos vinculados a esta atividade.</p>}
            </div>
            <div className={`daily-selected-activity ${selectedActivity ? 'is-open' : ''}`}>
              {selectedActivity && (
                <>
                <strong>{selectedActivity.name}</strong>
                <span>{selectedActivity.description || 'Sem descrição cadastrada.'}</span>
                </>
              )}
            </div>
          </div>

          <div className="field daily-description-field">
            <label>Descrição do que foi realizado</label>
            <textarea
              rows={7}
              maxLength={DESCRIPTION_LIMIT}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              disabled={saving}
              readOnly={readOnly}
              placeholder="Descreva como a atividade foi desenvolvida, os objetivos trabalhados e como as crianças participaram."
            />
            <span className="char-counter">{form.description.length}/{DESCRIPTION_LIMIT}</span>
            {fieldErrors.description && <p className="error">{fieldErrors.description}</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={saving}>{readOnly ? 'Voltar' : 'Cancelar'}</button>
            {!readOnly && <button type="submit" className="btn" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Registrar atividade'}</button>}
          </div>
        </div>
      </form>
    </section>
  )
}
