import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { DatePickerBr } from '../../components/DatePickerBr'
import { brToIsoDate, isoToBrDate } from '../../utils/dateBr'

const emptyFilters = {
  donation_catalog_id: '',
  donation_date: '',
  donor_name: '',
}

const emptyForm = {
  donation_catalog_id: '',
  donation_date: localDateBrValue(),
  item_ns: '',
  quilograma_kg: '',
  description: '',
  donor_name: '',
  donor_type: '',
  cpf: '',
  cnpj: '',
}

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canAccessDonationReceipt(auth) {
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['secretaria executiva', 'secretaria administrativa', 'administrador do sistema'].includes(profile)
}

function localDateBrValue() {
  const date = new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateBr(value) {
  if (!value) return '-'
  const [year, month, day] = String(value).split('-')
  if (!year || !month || !day) return '-'
  return `${day}/${month}/${year}`
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function maskCpf(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function maskCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function isValidCpf(value) {
  const digits = onlyDigits(value)
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(digits[9])) return false
  sum = 0
  for (let index = 0; index < 10; index += 1) sum += Number(digits[index]) * (11 - index)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(digits[10])
}

function isValidCnpj(value) {
  const digits = onlyDigits(value)
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false
  const calc = (base, weights) => {
    const sum = base.split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0)
    const remainder = sum % 11
    return remainder < 2 ? '0' : String(11 - remainder)
  }
  const first = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calc(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return digits.endsWith(`${first}${second}`)
}

function parseDecimalBr(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

export function RecebimentoDoacoesPage() {
  const auth = getAuth()
  const canAccess = canAccessDonationReceipt(auth)
  const [mode, setMode] = useState('list')
  const [catalogOptions, setCatalogOptions] = useState([])
  const [rows, setRows] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
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
      setForm({ ...emptyForm, donation_date: localDateBrValue() })
      setFieldErrors({})
      setError('')
      setMessage('')
    }
    window.addEventListener('recebimento-doacoes:list', showList)
    return () => window.removeEventListener('recebimento-doacoes:list', showList)
  }, [])

  async function loadCatalogOptions() {
    const data = await api('/catalogo-doacoes?page=1&page_size=100')
    setCatalogOptions(data.items || [])
  }

  async function loadRows() {
    if (!canAccess) return
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: '1', page_size: '100' })
      if (filters.donation_catalog_id) params.set('donation_catalog_id', filters.donation_catalog_id)
      if (filters.donation_date) params.set('donation_date', brToIsoDate(filters.donation_date))
      if (filters.donor_name.trim()) params.set('donor_name', filters.donor_name.trim())
      const data = await api(`/recebimento-doacoes?${params.toString()}`)
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
    loadCatalogOptions().catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    loadRows()
  }, [filters.donation_catalog_id, filters.donation_date, filters.donor_name])

  const displayRows = useMemo(() => rows.map((row, index) => ({
    ...row,
    sequence: index + 1,
    donation_date_label: formatDateBr(row.donation_date),
    type_label: row.donation_catalog_description || '-',
  })), [rows])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function updateForm(key, value) {
    let nextValue = value
    if (key === 'item_ns') nextValue = onlyDigits(value)
    if (key === 'quilograma_kg') nextValue = String(value).replace(/[^\d,.]/g, '')
    if (key === 'cpf') nextValue = maskCpf(value)
    if (key === 'cnpj') nextValue = maskCnpj(value)
    if (key === 'donor_type') {
      setForm((current) => ({ ...current, donor_type: value, cpf: '', cnpj: '' }))
      setFieldErrors((current) => {
        const clean = { ...current }
        delete clean.cpf
        delete clean.cnpj
        return clean
      })
      return
    }
    setForm((current) => ({ ...current, [key]: nextValue }))
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const clean = { ...current }
        delete clean[key]
        return clean
      })
    }
  }

  function validate(payload) {
    const errors = {}
    if (!payload.donation_catalog_id) errors.donation_catalog_id = 'Informe o tipo da doação.'
    if (!payload.donation_date) errors.donation_date = 'Informe a data da doação.'
    if (String(form.item_ns || '').trim() && Number(payload.item_ns) <= 0) errors.item_ns = 'Informe a quantidade de item(ns).'
    if (String(form.quilograma_kg || '').trim() && (!Number.isFinite(payload.quilograma_kg) || payload.quilograma_kg <= 0)) errors.quilograma_kg = 'Informe o peso em quilograma válido.'
    if (!payload.description.trim()) errors.description = 'Informe a descrição.'
    if (payload.description.trim().length > 1000) errors.description = 'Descrição deve ter no máximo 1000 caracteres.'
    if (!payload.donor_name.trim()) errors.donor_name = 'Informe o nome do doador.'
    if (payload.donor_name.trim().length > 150) errors.donor_name = 'Nome do doador deve ter no máximo 150 caracteres.'
    if (payload.cpf && !isValidCpf(payload.cpf)) errors.cpf = 'CPF inválido.'
    if (payload.cnpj && !isValidCnpj(payload.cnpj)) errors.cnpj = 'CNPJ inválido.'
    return errors
  }

  function buildPayload() {
    return {
      donation_catalog_id: Number(form.donation_catalog_id),
      donation_date: brToIsoDate(form.donation_date),
      item_ns: String(form.item_ns || '').trim() ? Number(form.item_ns) : null,
      quilograma_kg: String(form.quilograma_kg || '').trim() ? parseDecimalBr(form.quilograma_kg) : null,
      description: form.description.trim(),
      donor_name: form.donor_name.trim(),
      donor_type: form.donor_type || null,
      cpf: form.donor_type === 'Pessoa Física' && form.cpf.trim() ? form.cpf.trim() : null,
      cnpj: form.donor_type === 'Pessoa Jurídica' && form.cnpj.trim() ? form.cnpj.trim() : null,
    }
  }

  function openCreate() {
    setMode('form')
    setEditingId(null)
    setReadOnly(false)
    setForm({ ...emptyForm, donation_date: localDateBrValue() })
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  async function openItem(row, nextMode = 'form') {
    try {
      setLoading(true)
      const item = await api(`/recebimento-doacoes/${row.id}`)
      setForm({
        donation_catalog_id: String(item.donation_catalog_id || ''),
        donation_date: isoToBrDate(item.donation_date) || localDateBrValue(),
        item_ns: String(item.item_ns || ''),
        quilograma_kg: String(item.quilograma_kg || '').replace('.', ','),
        description: item.description || '',
        donor_name: item.donor_name || '',
        donor_type: item.donor_type || '',
        cpf: item.cpf || '',
        cnpj: item.cnpj || '',
      })
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
        await api(`/recebimento-doacoes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Recebimento de doação atualizado com sucesso.')
      } else {
        await api('/recebimento-doacoes', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Recebimento de doação cadastrado com sucesso.')
      }
      setMode('list')
      setEditingId(null)
      setReadOnly(false)
      setForm({ ...emptyForm, donation_date: localDateBrValue() })
      setFieldErrors({})
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deactivateItem(row) {
    if (!window.confirm('Confirma a inativação deste recebimento de doação?')) return
    try {
      setLoading(true)
      await api(`/recebimento-doacoes/${row.id}`, { method: 'DELETE' })
      setMessage('Recebimento de doação inativado com sucesso.')
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
        <h2>Recebimento de Doações</h2>
        {error && <p className="error">{error}</p>}
        <form className="card donation-receipt-form" onSubmit={save} noValidate>
          <fieldset className="form-section donation-section donation-data-section">
            <legend>Doação</legend>
            <div className="form-row">
              <div className="field">
                <label>Tipo</label>
                <select value={form.donation_catalog_id} onChange={(event) => updateForm('donation_catalog_id', event.target.value)} disabled={readOnly || loading} required aria-invalid={Boolean(fieldErrors.donation_catalog_id)}>
                  <option value="">Selecione</option>
                  {catalogOptions.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
                </select>
                {fieldErrors.donation_catalog_id && <p className="error">{fieldErrors.donation_catalog_id}</p>}
              </div>
              <div className="field">
                <DatePickerBr label="Data da Doação" value={form.donation_date} onChange={(value) => updateForm('donation_date', value)} disabled={readOnly || loading} required />
                {fieldErrors.donation_date && <p className="error">{fieldErrors.donation_date}</p>}
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Item(ns)</label>
                <input value={form.item_ns} onChange={(event) => updateForm('item_ns', event.target.value)} disabled={readOnly || loading} inputMode="numeric" aria-invalid={Boolean(fieldErrors.item_ns)} />
                {fieldErrors.item_ns && <p className="error">{fieldErrors.item_ns}</p>}
              </div>
              <div className="field">
                <label>Quilograma (kg)</label>
                <input value={form.quilograma_kg} onChange={(event) => updateForm('quilograma_kg', event.target.value)} disabled={readOnly || loading} inputMode="decimal" aria-invalid={Boolean(fieldErrors.quilograma_kg)} />
                {fieldErrors.quilograma_kg && <p className="error">{fieldErrors.quilograma_kg}</p>}
              </div>
            </div>

            <div className="field">
              <label>Descrição</label>
              <textarea rows={5} maxLength={1000} value={form.description} onChange={(event) => updateForm('description', event.target.value)} disabled={readOnly || loading} required aria-invalid={Boolean(fieldErrors.description)} />
              {fieldErrors.description && <p className="error">{fieldErrors.description}</p>}
            </div>
          </fieldset>

          <fieldset className="form-section donation-section donor-data-section">
            <legend>Doador</legend>
            <div className="form-row">
              <div className="field">
                <label>Nome</label>
                <input value={form.donor_name} maxLength={150} onChange={(event) => updateForm('donor_name', event.target.value)} disabled={readOnly || loading} required aria-invalid={Boolean(fieldErrors.donor_name)} />
                {fieldErrors.donor_name && <p className="error">{fieldErrors.donor_name}</p>}
              </div>
            </div>

            <div className="donor-identification-card">
              <span className="section-title">Identificação do Doador (Opcional)</span>
              <div className="donor-identification-grid" role="radiogroup" aria-label="Identificação do doador">
                <div className={`donor-option-card ${form.donor_type === 'Pessoa Física' ? 'active' : ''} ${form.donor_type && form.donor_type !== 'Pessoa Física' ? 'readonly' : ''}`}>
                  <label className="donor-option-title">
                    <input type="radio" name="donor_type" checked={form.donor_type === 'Pessoa Física'} onChange={() => updateForm('donor_type', 'Pessoa Física')} disabled={readOnly || loading} />
                    Pessoa Física
                  </label>
                  <div className="field donor-document-field">
                    <label>CPF</label>
                    <input value={form.cpf} onChange={(event) => updateForm('cpf', event.target.value)} disabled={readOnly || loading || form.donor_type !== 'Pessoa Física'} placeholder="Digite o CPF ou informe que não foi informado" aria-invalid={Boolean(fieldErrors.cpf)} />
                    {fieldErrors.cpf && <p className="error">{fieldErrors.cpf}</p>}
                  </div>
                </div>

                <div className={`donor-option-card ${form.donor_type === 'Pessoa Jurídica' ? 'active' : ''} ${form.donor_type && form.donor_type !== 'Pessoa Jurídica' ? 'readonly' : ''}`}>
                  <label className="donor-option-title">
                    <input type="radio" name="donor_type" checked={form.donor_type === 'Pessoa Jurídica'} onChange={() => updateForm('donor_type', 'Pessoa Jurídica')} disabled={readOnly || loading} />
                    Pessoa Jurídica
                  </label>
                  <div className="field donor-document-field">
                    <label>CNPJ</label>
                    <input value={form.cnpj} onChange={(event) => updateForm('cnpj', event.target.value)} disabled={readOnly || loading || form.donor_type !== 'Pessoa Jurídica'} placeholder="Digite o CNPJ" aria-invalid={Boolean(fieldErrors.cnpj)} />
                    {fieldErrors.cnpj && <p className="error">{fieldErrors.cnpj}</p>}
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setMode('list'); setReadOnly(false); setEditingId(null); setError('') }}>Cancelar</button>
            {!readOnly && <button type="submit" disabled={loading}>Salvar</button>}
          </div>
        </form>
      </section>
    )
  }

  return (
    <section>
      <div className="list-header">
        <h2>Recebimento de Doações</h2>
        <button type="button" className="btn" onClick={openCreate}>Receber</button>
      </div>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="search-toolbar donation-receipt-filters">
          <div className="search-filter-field">
            <label>TIPO DE DOAÇÃO</label>
            <select value={filters.donation_catalog_id} onChange={(event) => updateFilter('donation_catalog_id', event.target.value)}>
              <option value="">Todos</option>
              {catalogOptions.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
            </select>
          </div>
          <div className="search-filter-field">
            <DatePickerBr label="DATA" value={filters.donation_date} onChange={(value) => updateFilter('donation_date', value)} />
          </div>
          <div className="search-filter-field donation-receipt-donor-filter">
            <label>NOME DO DOADOR</label>
            <input value={filters.donor_name} onChange={(event) => updateFilter('donor_name', event.target.value)} placeholder="Digite para pesquisar" />
          </div>
        </div>

        {loading && <p className="pagination-label">Carregando...</p>}
        <div className="table-wrap">
          <table className="list-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Tipo de Doação</th>
                <th>Data</th>
                <th>Nome do Doador</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan={5}>Nenhum recebimento de doação encontrado.</td></tr>
              )}
              {displayRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sequence}</td>
                  <td>{row.type_label}</td>
                  <td>{row.donation_date_label}</td>
                  <td>{row.donor_name}</td>
                  <td className="actions-col">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <ActionIconButton action="view" label="Visualizar recebimento" onClick={() => openItem(row, 'view')} />
                      {row.is_active && <ActionIconButton action="edit" label="Editar recebimento" onClick={() => openItem(row, 'form')} />}
                      {row.is_active && <ActionIconButton action="delete" label="Inativar recebimento" onClick={() => deactivateItem(row)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pagination-label">Mostrando {displayRows.length} de {displayRows.length} registro(s)</p>
      </div>
    </section>
  )
}
