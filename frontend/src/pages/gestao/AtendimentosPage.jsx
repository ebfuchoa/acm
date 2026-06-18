import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { ActionIconButton } from '../../components/ActionIconButton'
import { DatePickerBr } from '../../components/DatePickerBr'
import { brToIsoDate, isoToBrDate } from '../../utils/dateBr'

const emptyForm = { data_atendimento: '', nome: '', demanda: '', atendente_nome: '', atendente_funcao: '' }

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function AtendimentosPage() {
  const auth = getAuth()
  const profile = normalizeProfile(auth?.profile)
  const canManage = Boolean(auth?.is_admin) || ['coordenador', 'coordenadora', 'tecnico'].includes(profile)
  const canRead = canManage
  const canWrite = canManage
  const canDelete = canManage

  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [nomeFilter, setNomeFilter] = useState('')
  const [dataFilter, setDataFilter] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadRows() {
    if (!canRead) return
    setLoading(true)
    try {
      setRows(await api('/atendimentos'))
      setError('')
    } catch (err) {
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
      setForm(emptyForm)
      setFieldErrors({})
      setError('')
    }

    window.addEventListener('atendimentos:list', showList)
    return () => window.removeEventListener('atendimentos:list', showList)
  }, [])

  const filteredRows = useMemo(() => {
    const nome = nomeFilter.trim().toLowerCase()
    const dataIso = brToIsoDate(dataFilter)
    return rows.filter((row) => {
      const matchesNome = !nome || String(row.nome || '').toLowerCase().includes(nome)
      const matchesData = !dataFilter || (dataIso && row.data_atendimento === dataIso)
      return matchesNome && matchesData
    })
  }, [rows, nomeFilter, dataFilter])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setMode('form')
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  async function openItem(row, nextMode) {
    setLoading(true)
    try {
      const item = await api(`/atendimentos/${row.id}`)
      setForm({
        data_atendimento: isoToBrDate(item.data_atendimento),
        nome: item.nome || '',
        demanda: item.demanda || '',
        atendente_nome: item.atendente_nome || '',
        atendente_funcao: item.atendente_funcao || '',
      })
      setEditingId(item.id)
      setMode(nextMode)
      setFieldErrors({})
      setError('')
      setMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function validate() {
    const nextErrors = {}
    if (!brToIsoDate(form.data_atendimento)) nextErrors.data_atendimento = 'Informe a data do atendimento.'
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome.'
    if (!form.demanda.trim()) nextErrors.demanda = 'Informe a demanda.'
    return nextErrors
  }

  async function onSave(event) {
    event.preventDefault()
    const nextErrors = validate()
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setError('Revise os campos obrigatórios antes de salvar.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const payload = {
        data_atendimento: brToIsoDate(form.data_atendimento),
        nome: form.nome.trim(),
        demanda: form.demanda.trim(),
      }
      if (editingId) {
        await api(`/atendimentos/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setMessage('Atendimento atualizado com sucesso.')
      } else {
        await api('/atendimentos', { method: 'POST', body: JSON.stringify(payload) })
        setMessage('Atendimento cadastrado com sucesso.')
      }
      setMode('list')
      setForm(emptyForm)
      setEditingId(null)
      setFieldErrors({})
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusão do atendimento?')) return
    setLoading(true)
    try {
      await api(`/atendimentos/${row.id}`, { method: 'DELETE' })
      setMessage('Atendimento excluído com sucesso.')
      setError('')
      await loadRows()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function clearFieldError(field) {
    if (!fieldErrors[field]) return
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  if (!canRead) return <p className="error">Acesso negado.</p>

  if (mode === 'form' || mode === 'view') {
    const readOnly = mode === 'view'
    return (
      <section>
        <h2>{readOnly ? 'Visualizar Atendimento' : editingId ? 'Editar Atendimento' : 'Novo Atendimento'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={onSave} className="card" noValidate>
          <div className="form-row atendimento-form-row">
            <div className="field">
              <DatePickerBr
                label="Data do Atendimento"
                value={form.data_atendimento}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, data_atendimento: value }))
                  clearFieldError('data_atendimento')
                }}
                required
                disabled={readOnly}
              />
              {fieldErrors.data_atendimento && <p className="error">{fieldErrors.data_atendimento}</p>}
            </div>
            <div className="field">
              <label>Nome</label>
              <input
                value={form.nome}
                maxLength={200}
                disabled={readOnly}
                required
                aria-invalid={Boolean(fieldErrors.nome)}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, nome: event.target.value }))
                  clearFieldError('nome')
                }}
              />
              {fieldErrors.nome && <p className="error">{fieldErrors.nome}</p>}
            </div>
          </div>
          <div className="form-row atendimento-responsavel-row">
            <div className="field">
              <label>Profissional Responsável</label>
              <input value={form.atendente_nome || auth?.user_name || ''} disabled />
            </div>
            <div className="field">
              <label>Função</label>
              <input value={form.atendente_funcao || auth?.profile || ''} disabled />
            </div>
          </div>
          <div className="field">
            <label>Demanda</label>
            <textarea
              value={form.demanda}
              rows={20}
              disabled={readOnly}
              required
              aria-invalid={Boolean(fieldErrors.demanda)}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, demanda: event.target.value }))
                clearFieldError('demanda')
              }}
            />
            {fieldErrors.demanda && <p className="error">{fieldErrors.demanda}</p>}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setMode('list')}>Voltar</button>
            {!readOnly && <button type="submit" disabled={loading}>Salvar</button>}
          </div>
        </form>
      </section>
    )
  }

  return (
    <section>
      <div className="list-header">
        <h2>Atendimentos</h2>
        {canWrite && <button type="button" className="btn" onClick={openCreate}>Novo Atendimento</button>}
      </div>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="form-row atendimento-filtros-row">
          <div className="field">
            <label>Nome</label>
            <input value={nomeFilter} onChange={(event) => setNomeFilter(event.target.value)} />
          </div>
          <div className="field">
            <DatePickerBr label="Data do Atendimento" value={dataFilter} onChange={setDataFilter} />
          </div>
        </div>

        {loading && <p>Carregando...</p>}

        {!loading && (
          <div className="table-wrap">
            <table className="list-table atendimentos-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nome</th>
                  <th>Profissional</th>
                  <th>Demanda</th>
                  <th className="actions-col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr><td colSpan="5">Nenhum atendimento encontrado.</td></tr>
                )}
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{isoToBrDate(row.data_atendimento)}</td>
                    <td>{row.nome}</td>
                    <td>{row.atendente_nome}</td>
                    <td className="atendimentos-demanda-cell" title={row.demanda}>{row.demanda}</td>
                    <td className="actions-col">
                      <div style={{ display: 'flex', gap: 6 }}>
                        <ActionIconButton action="view" label="Visualizar atendimento" onClick={() => openItem(row, 'view')} />
                        {canWrite && <ActionIconButton action="edit" label="Editar atendimento" onClick={() => openItem(row, 'form')} />}
                        {canDelete && <ActionIconButton action="delete" label="Excluir atendimento" onClick={() => onDelete(row)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
