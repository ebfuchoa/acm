import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { ActionIconButton } from '../../components/ActionIconButton'
import { CadastroListView } from '../../components/CadastroListView'

const emptyForm = { name: '', cpf: '', role: '', social_unit_id: '', email: '', password: '' }
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'cpf', label: 'CPF' },
  { key: 'role', label: 'Funcao' },
  { key: 'social_unit_name', label: 'Unidade social' },
  { key: 'email', label: 'E-mail' },
]

const maskCpf = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function ColaboradoresPage() {
  const [mode, setMode] = useState('list')
  const [rows, setRows] = useState([])
  const [units, setUnits] = useState([])
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setForm(emptyForm)
      setError('')
      setMessage('')
    }
    window.addEventListener('colaboradores:list', showList)
    return () => window.removeEventListener('colaboradores:list', showList)
  }, [])

  async function loadData() {
    try {
      const [collaborators, socialUnits, profileOptions] = await Promise.all([api('/colaboradores'), api('/unidades-sociais'), api('/perfis')])
      setUnits(socialUnits)
      setProfiles(profileOptions)
      const byId = Object.fromEntries(socialUnits.map((u) => [u.id, u.name]))
      setRows(collaborators.map((c) => ({ ...c, social_unit_name: byId[c.social_unit_id] || '-' })))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(
    () => rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))),
    [rows, search],
  )

  async function onSave(e) {
    e.preventDefault()
    setError('')
    const payload = { ...form, name: form.name.trim(), cpf: form.cpf.trim(), role: form.role.trim(), email: form.email.trim().toLowerCase(), social_unit_id: Number(form.social_unit_id) }
    if (editingId) {
      if (!payload.password.trim()) delete payload.password
      await api(`/colaboradores/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
    } else {
      await api('/colaboradores', { method: 'POST', body: JSON.stringify(payload) })
    }
    setMode('list')
    setForm(emptyForm)
    setEditingId(null)
    setMessage('Colaborador salvo com sucesso.')
    await loadData()
  }

  async function onEdit(row) {
    const item = await api(`/colaboradores/${row.id}`)
    setForm({ name: item.name || '', cpf: item.cpf || '', role: item.role || '', social_unit_id: String(item.social_unit_id || ''), email: item.email || '', password: '' })
    setEditingId(item.id)
    setMode('form')
  }

  async function onDelete(row) {
    if (!window.confirm('Confirma a exclusao do colaborador?')) return
    await api(`/colaboradores/${row.id}`, { method: 'DELETE' })
    setMessage('Colaborador excluido com sucesso.')
    await loadData()
  }

  if (mode === 'form') {
    return (
      <section>
        <h2>{editingId ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={onSave} className="card">
          <div className="form-row form-row-3">
            <div className="field"><label>Nome</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
            <div className="field"><label>CPF</label><input value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: maskCpf(e.target.value) }))} required /></div>
            <div className="field"><label>Perfil</label><select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} required><option value="">Selecione</option>{profiles.map((profile) => <option key={profile.id} value={profile.name}>{profile.name} - {profile.description}</option>)}</select></div>
          </div>
          <div className="form-row form-row-3">
            <div className="field"><label>Unidade social</label><select value={form.social_unit_id} onChange={(e) => setForm((p) => ({ ...p, social_unit_id: e.target.value }))} required><option value="">Selecione</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="field"><label>E-mail</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required /></div>
            <div className="field"><label>Senha</label><input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required={!editingId} /></div>
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
        title="Colaboradores"
        columns={columns}
        rows={filtered}
        searchTerm={search}
        onSearchChange={setSearch}
        onCadastrar={() => { setMode('form'); setEditingId(null); setForm(emptyForm); setError('') }}
        renderActions={(row) => (
          <div style={{ display: 'flex', gap: 6 }}>
            <ActionIconButton action="edit" label="Editar colaborador" onClick={() => onEdit(row)} />
            <ActionIconButton action="delete" label="Excluir colaborador" onClick={() => onDelete(row)} />
          </div>
        )}
      />
    </>
  )
}
