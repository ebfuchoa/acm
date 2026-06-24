import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'user_id', label: 'ID Usuário' },
  { key: 'activity_id', label: 'ID Atividade' },
]

export function InscricoesPage() {
  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ user_id: '', activity_id: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    function showList() {
      setMode('list')
      setForm({ user_id: '', activity_id: '' })
      setError('')
      setMessage('')
    }
    window.addEventListener('inscricoes:list', showList)
    return () => window.removeEventListener('inscricoes:list', showList)
  }, [])

  async function loadRows() {
    try { setRows(await api('/inscricoes')); setError('') } catch (err) { setError(err.message) }
  }

  useEffect(() => { loadRows() }, [])

  const filteredRows = useMemo(() => rows.filter((row) => columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))), [rows, search])

  async function save(e) {
    e.preventDefault()
    try {
      await api('/inscricoes', { method: 'POST', body: JSON.stringify({ user_id: Number(form.user_id), activity_id: Number(form.activity_id) }) })
      setForm({ user_id: '', activity_id: '' })
      await loadRows()
      setMode('list')
      setMessage('Inscrição cadastrada com sucesso.')
    } catch (err) { setError(err.message) }
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusão da inscrição?')) return
    try {
      await api(`/inscricoes/${row.id}`, { method: 'DELETE' })
      await loadRows()
      setMessage('Inscrição excluída com sucesso.')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (mode === 'form') {
    return (
      <section>
        <h2>Cadastrar Inscrição em Atividade</h2>
        {error && <p className="error">{error}</p>}
        <form className="card" onSubmit={save}>
          <div className="field"><label>ID do usuário</label><input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required /></div>
          <div className="field"><label>ID da atividade</label><input value={form.activity_id} onChange={(e) => setForm({ ...form, activity_id: e.target.value })} required /></div>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setMode('list')}>Voltar</button><button type="submit">Salvar</button></div>
        </form>
      </section>
    )
  }

  return (
    <>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}
      <CadastroListView
        title="Inscrições em Atividades"
        columns={columns}
        rows={filteredRows}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={() => { setError(''); setMode('form') }}
        renderActions={(row) => (
          <ActionIconButton action="delete" label="Excluir inscrição" onClick={() => onDelete(row)} />
        )}
      />
    </>
  )
}
