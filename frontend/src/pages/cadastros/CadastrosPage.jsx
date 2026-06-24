import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { maskTime } from '../../utils/formattersBr'

export function CadastrosPage() {
  const [units, setUnits] = useState([])
  const [users, setUsers] = useState([])
  const [activities, setActivities] = useState([])
  const [error, setError] = useState('')

  const [unitName, setUnitName] = useState('')
  const [userForm, setUserForm] = useState({ unit_id: '', full_name: '', email: '' })
  const [activityForm, setActivityForm] = useState({ unit_id: '', name: '', category: '', schedule: '' })

  async function loadAll() {
    try {
      const [u, us, ac] = await Promise.all([api('/unidades-sociais'), api('/usuarios'), api('/atividades')])
      setUnits(u)
      setUsers(us)
      setActivities(ac)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function createUnit(e) {
    e.preventDefault()
    await api('/unidades-sociais', { method: 'POST', body: JSON.stringify({ name: unitName, is_matrix: false }) })
    setUnitName('')
    loadAll()
  }

  async function createUser(e) {
    e.preventDefault()
    await api('/usuarios', { method: 'POST', body: JSON.stringify({ ...userForm, unit_id: Number(userForm.unit_id) }) })
    setUserForm({ unit_id: '', full_name: '', email: '' })
    loadAll()
  }

  async function createActivity(e) {
    e.preventDefault()
    await api('/atividades', {
      method: 'POST',
      body: JSON.stringify({
        ...activityForm,
        unit_id: Number(activityForm.unit_id),
        min_age: 0,
        max_age: 18,
        capacity: 30,
      }),
    })
    setActivityForm({ unit_id: '', name: '', category: '', schedule: '' })
    loadAll()
  }

  return (
    <section>
      <h2>Cadastros Base</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        <form onSubmit={createUnit} className="card" id="unidade-social">
          <h3>Nova Unidade Social</h3>
          <input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Nome da unidade" required />
          <button type="submit">Salvar Unidade</button>
        </form>

        <form onSubmit={createUser} className="card" id="usuario">
          <h3>Novo Usuário</h3>
          <input placeholder="ID da unidade" value={userForm.unit_id} onChange={(e) => setUserForm({ ...userForm, unit_id: e.target.value })} required />
          <input placeholder="Nome" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
          <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
          <button type="submit">Salvar Usuário</button>
        </form>

        <form onSubmit={createActivity} className="card" id="atividades">
          <h3>Nova Atividade</h3>
          <input placeholder="ID da unidade" value={activityForm.unit_id} onChange={(e) => setActivityForm({ ...activityForm, unit_id: e.target.value })} required />
          <input placeholder="Nome" value={activityForm.name} onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })} required />
          <input placeholder="Categoria" value={activityForm.category} onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })} required />
          <input placeholder="Horário" value={activityForm.schedule} onChange={(e) => setActivityForm({ ...activityForm, schedule: maskTime(e.target.value) })} maxLength={5} required />
          <button type="submit">Salvar Atividade</button>
        </form>
      </div>

      <div className="grid">
        <article className="card"><h3>Unidades</h3>{units.map((x) => <p key={x.id}>{x.id} - {x.name}</p>)}</article>
        <article className="card"><h3>Usuários</h3>{users.map((x) => <p key={x.id}>{x.full_name} ({x.status})</p>)}</article>
        <article className="card"><h3>Atividades</h3>{activities.map((x) => <p key={x.id}>{x.name} - {x.schedule}</p>)}</article>
      </div>
    </section>
  )
}


