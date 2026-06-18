import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function ClassificacaoGrupoPage() {
  const auth = getAuth()
  const profile = String(auth?.profile || '').toLowerCase()
  const canManage = Boolean(auth?.is_admin) || ['coordenador', 'coordinator', 'secretária executiva', 'secretaria executiva'].includes(profile)

  const [rows, setRows] = useState([])
  const [groupsFilter, setGroupsFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Manhã')
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadRows() {
    try {
      const data = await api('/classificacao-grupos')
      setRows(data)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  const groupOptions = useMemo(
    () => rows.map((item) => ({ id: String(item.group_id), name: item.group_name })),
    [rows],
  )

  const filteredRows = useMemo(() => {
    return rows
      .filter((item) => (groupsFilter ? String(item.group_id) === groupsFilter : true))
      .map((item) => {
        const users = item.users
          .filter((user) => (statusFilter === 'todos' ? true : user.status === statusFilter))
          .filter((user) => String(user.name || '').toLowerCase().includes(search.toLowerCase()))
        return { ...item, users }
      })
  }, [rows, groupsFilter, statusFilter, search])

  const rowsByActiveTab = useMemo(() => {
    const normalizedTab = normalizeText(activeTab)
    return filteredRows.filter((item) => normalizeText(item.shift) === normalizedTab)
  }, [filteredRows, activeTab])

  function toggleGroup(groupId) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  async function onLink(userId, groupId) {
    try {
      await api('/classificacao-grupos/vincular-usuario', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, group_id: groupId }),
      })
      setMessage('Usuário vinculado ao grupo com sucesso.')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onUnlink(userId, groupId) {
    if (!window.confirm('Confirma a desvinculação do usuário deste grupo?')) return
    try {
      await api('/classificacao-grupos/desvincular-usuario', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId, group_id: groupId }),
      })
      setMessage('Usuário desvinculado do grupo com sucesso.')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <h2>Classificação por Grupo</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="form-row classificacao-filters-row">
          <div className="field">
            <label>Grupo</label>
            <select value={groupsFilter} onChange={(e) => setGroupsFilter(e.target.value)}>
              <option value="">Todos</option>
              {groupOptions.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="vinculado">Vinculados</option>
            </select>
          </div>
          <div className="field">
            <label>Busca por nome</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite o nome do usuário" />
          </div>
        </div>
      </div>

      <div className="tabs classificacao-tabs" style={{ marginTop: 12 }}>
        <button type="button" className={`tab-btn classificacao-tab-btn ${activeTab === 'Manhã' ? 'active' : ''}`} onClick={() => setActiveTab('Manhã')}>
          Manhã
        </button>
        <button type="button" className={`tab-btn classificacao-tab-btn ${activeTab === 'Tarde' ? 'active' : ''}`} onClick={() => setActiveTab('Tarde')}>
          Tarde
        </button>
      </div>

      {rowsByActiveTab.length === 0 && <p>Nenhum grupo cadastrado para este turno.</p>}

      {rowsByActiveTab.map((group) => (
        <article key={group.group_id} className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 style={{ marginBottom: 0 }}>{group.group_name} ({group.age_range})</h3>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: 34, height: 34, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1 }}
              onClick={() => toggleGroup(group.group_id)}
              title={collapsedGroups[group.group_id] ? 'Expandir grupo' : 'Recolher grupo'}
              aria-label={collapsedGroups[group.group_id] ? 'Expandir grupo' : 'Recolher grupo'}
            >
              {collapsedGroups[group.group_id] ? '+' : '−'}
            </button>
          </div>

          {!collapsedGroups[group.group_id] && (
            <div className="table-wrap">
              <table className="list-table classificacao-table">
                <colgroup>
                  <col className="col-nome" />
                  <col className="col-idade" />
                  <col className="col-status" />
                  <col className="col-acoes" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Idade</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {group.users.length === 0 && (
                    <tr>
                      <td colSpan={4}>Nenhum usuário encontrado para este grupo.</td>
                    </tr>
                  )}
                  {group.users.map((user) => (
                    <tr key={`${group.group_id}-${user.user_id}`}>
                      <td>{user.name}</td>
                      <td>{user.age} anos</td>
                      <td>
                        <span className={`badge ${user.status === 'vinculado' ? 'badge-ok' : 'badge-pending'}`}>
                          {user.status === 'vinculado' ? 'Vinculado' : 'Pendente'}
                        </span>
                      </td>
                      <td>
                        {user.status === 'vinculado' ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={!canManage}
                            onClick={() => onUnlink(user.user_id, group.group_id)}
                          >
                            Desvincular
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => onLink(user.user_id, group.group_id)}
                          >
                            Vincular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
