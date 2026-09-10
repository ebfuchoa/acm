import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'
import { brToIsoDate, isoToBrDate } from '../../utils/dateBr'
import { DatePickerBr } from '../../components/DatePickerBr'

const WEEK_DAYS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
]
const ALL_GROUPS_VALUE = 'todos'

function frequencyKey(groupId, userId) {
  return `${groupId}-${userId}`
}

function startOfWeekIso(value) {
  const ref = value ? new Date(`${value}T00:00:00`) : new Date()
  const day = ref.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(ref)
  monday.setDate(ref.getDate() + diff)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeekBr(valueBr) {
  const iso = brToIsoDate(valueBr)
  if (!iso) return ''
  return isoToBrDate(startOfWeekIso(iso))
}

function weekDaysWithDates(valueBr) {
  const iso = brToIsoDate(valueBr)
  if (!iso) return WEEK_DAYS
  const monday = new Date(`${startOfWeekIso(iso)}T00:00:00`)
  return WEEK_DAYS.map((day, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const dateLabel = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
    return { ...day, dateLabel }
  })
}

export function FrequenciaPage() {
  const auth = getAuth()
  const role = String(auth?.profile || '').toLowerCase()
  const canManage = Boolean(auth?.is_admin) || ['coordenador', 'coordinator', 'tecnico', 'técnico', 'secretária executiva', 'secretaria executiva', 'educador(a)'].includes(role)

  const [semanaReferenciaBr, setSemanaReferenciaBr] = useState(isoToBrDate(startOfWeekIso()))
  const [turno, setTurno] = useState('manha')
  const [grupoId, setGrupoId] = useState('')
  const [grupos, setGrupos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [frequencias, setFrequencias] = useState({})
  const [justificativas, setJustificativas] = useState({})
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [justificationModal, setJustificationModal] = useState(null)
  const [deletingJustification, setDeletingJustification] = useState(false)

  const gruposExibidos = useMemo(
    () => grupoId === ALL_GROUPS_VALUE
      ? grupos
      : grupos.filter((item) => String(item.id) === String(grupoId)),
    [grupos, grupoId],
  )
  const weekDays = useMemo(() => weekDaysWithDates(semanaReferenciaBr), [semanaReferenciaBr])

  useEffect(() => {
    let ignore = false

    async function loadGroups() {
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const rows = await api(`/frequencias/grupos?turno=${encodeURIComponent(turno)}`)
        if (ignore) return
        setGrupos(rows)
        setGrupoId((prev) => {
          if (prev === ALL_GROUPS_VALUE || rows.some((g) => String(g.id) === String(prev))) return prev
          return rows.length ? ALL_GROUPS_VALUE : ''
        })
      } catch (err) {
        if (ignore) return
        setError(err.message)
        setGrupos([])
        setGrupoId('')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadGroups()

    return () => {
      ignore = true
    }
  }, [turno])

  useEffect(() => {
    if (!grupoId) {
      setUsuarios([])
      setFrequencias({})
      setJustificativas({})
      return
    }

    const semanaIso = brToIsoDate(semanaReferenciaBr)
    if (!semanaIso) {
      setUsuarios([])
      setFrequencias({})
      setJustificativas({})
      return
    }

    let ignore = false

    async function loadFrequencyContext() {
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const selectedGroups = grupoId === ALL_GROUPS_VALUE
          ? grupos
          : grupos.filter((group) => String(group.id) === String(grupoId))
        const contexts = await Promise.all(selectedGroups.map(async (group) => {
          const [usersRows, weekRows] = await Promise.all([
            api(`/frequencias/usuarios?grupo_id=${Number(group.id)}&turno=${encodeURIComponent(turno)}`),
            api(`/frequencias/semanal?semana=${encodeURIComponent(semanaIso)}&grupo_id=${Number(group.id)}&turno=${encodeURIComponent(turno)}`),
          ])
          return { group, usersRows, weekRows }
        }))

        if (ignore) return
        setUsuarios(contexts.flatMap(({ usersRows }) => usersRows))
        const map = {}
        const justificationMap = {}
        contexts.forEach(({ group, weekRows }) => {
          ;(weekRows.frequencias || []).forEach((item) => {
            map[frequencyKey(group.id, item.usuario_id)] = { ...item.dias }
            justificationMap[frequencyKey(group.id, item.usuario_id)] = item.justificativa || ''
          })
        })
        setFrequencias(map)
        setJustificativas(justificationMap)
      } catch (err) {
        if (ignore) return
        setError(err.message)
        setUsuarios([])
        setFrequencias({})
        setJustificativas({})
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadFrequencyContext()

    return () => {
      ignore = true
    }
  }, [grupoId, grupos, turno, semanaReferenciaBr])

  useEffect(() => {
    setJustificativas((prev) => {
      let changed = false
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        const current = frequencias[key] || {}
        const userHasAbsence = WEEK_DAYS.some((day) => !Boolean(current[day.key]))
        if (!userHasAbsence && next[key]) {
          next[key] = ''
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [frequencias])

  function onTurnoChange(value) {
    setGrupoId('')
    setGrupos([])
    setUsuarios([])
    setFrequencias({})
    setJustificativas({})
    setError('')
    setMessage('')
    setTurno(value)
  }

  function onToggle(groupId, userId, dayKey) {
    const key = frequencyKey(groupId, userId)
    setFrequencias((prev) => {
      const current = prev[key] || {}
      return {
        ...prev,
        [key]: {
          ...current,
          [dayKey]: !Boolean(current[dayKey]),
        },
      }
    })
  }

  function hasAbsence(groupId, userId) {
    const current = frequencias[frequencyKey(groupId, userId)] || {}
    return WEEK_DAYS.some((day) => !Boolean(current[day.key]))
  }

  function onJustificationChange(groupId, userId, value) {
    const key = frequencyKey(groupId, userId)
    setJustificativas((prev) => ({ ...prev, [key]: value }))
  }

  function openJustificationModal(user) {
    const key = frequencyKey(user.grupo_id, user.usuario_id)
    setJustificationModal({
      key,
      groupId: user.grupo_id,
      userId: user.usuario_id,
      userName: user.nome,
      groupName: user.grupo_nome,
      hasAbsence: hasAbsence(user.grupo_id, user.usuario_id),
    })
  }

  function closeJustificationModal() {
    setJustificationModal(null)
  }

  async function onDeleteJustification() {
    if (!justificationModal || !canManage) return
    const semanaIso = brToIsoDate(semanaReferenciaBr)
    if (!semanaIso) {
      setError('Informe a semana de referência no formato dd/mm/aaaa.')
      return
    }

    setDeletingJustification(true)
    setError('')
    setMessage('')
    try {
      const params = new URLSearchParams({
        semana: semanaIso,
        grupo_id: String(justificationModal.groupId),
        turno,
        usuario_id: String(justificationModal.userId),
      })
      await api(`/frequencias/semanal/justificativa?${params.toString()}`, { method: 'DELETE' })
      setJustificativas((prev) => ({ ...prev, [justificationModal.key]: '' }))
      setMessage('Justificativa excluída com sucesso.')
      closeJustificationModal()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingJustification(false)
    }
  }

  function toggleGroup(groupId) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  async function onSave() {
    if (!canManage) {
      setError('Acesso negado para registrar frequência.')
      return
    }
    if (!grupoId) {
      setError('Selecione um grupo para registrar frequência.')
      return
    }

    const semanaIso = brToIsoDate(semanaReferenciaBr)
    if (!semanaIso) {
      setError('Informe a semana de referência no formato dd/mm/aaaa.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    try {
      const selectedGroups = grupoId === ALL_GROUPS_VALUE
        ? grupos
        : grupos.filter((group) => String(group.id) === String(grupoId))
      await Promise.all(selectedGroups.map((group) => api('/frequencias/semanal', {
        method: 'POST',
        body: JSON.stringify({
          semana_referencia: semanaIso,
          grupo_id: Number(group.id),
          turno,
          frequencias: usuarios
            .filter((user) => String(user.grupo_id) === String(group.id))
            .map((user) => ({
              usuario_id: user.usuario_id,
              justificativa: hasAbsence(group.id, user.usuario_id)
                ? (justificativas[frequencyKey(group.id, user.usuario_id)] || '')
                : null,
              dias: WEEK_DAYS.reduce((acc, day) => {
                acc[day.key] = Boolean(frequencias[frequencyKey(group.id, user.usuario_id)]?.[day.key])
                return acc
              }, {}),
            })),
        }),
      })))
      setMessage('Frequência semanal salva com sucesso.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>Frequência</h2>
      <div className="frequencia-feedback" aria-live="polite">
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <div className="form-row frequencia-filtros-row">
          <div className="field">
            <DatePickerBr
              label="SEMANA DE REFERÊNCIA"
              value={semanaReferenciaBr}
              onChange={(v) => setSemanaReferenciaBr(startOfWeekBr(v) || v)}
            />
          </div>
          <div className="field">
            <label>TURNO</label>
            <select value={turno} onChange={(e) => onTurnoChange(e.target.value)}>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
          <div className="field">
            <label>GRUPO</label>
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              {!grupos.length && <option value="">Nenhum grupo disponível</option>}
              {!!grupos.length && <option value={ALL_GROUPS_VALUE}>Todos</option>}
              {grupos.map((group) => (
                <option key={group.id} value={group.id}>{group.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="card" style={{ marginTop: 12 }}><p>Carregando...</p></div>}

      {!loading && gruposExibidos.map((group) => {
        const groupUsers = usuarios.filter((user) => String(user.grupo_id) === String(group.id))
        return (
          <div className="card" style={{ marginTop: 12 }} key={group.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <p className="frequencia-grupo-resumo" style={{ flex: 1 }}>
                <span>Grupo: <strong>{group.nome}</strong></span>
                <span>Turno: <strong>{group.turno}</strong></span>
                <span>Faixa etária: <strong>{group.faixa_etaria}</strong></span>
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: 34, height: 34, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1 }}
                onClick={() => toggleGroup(group.id)}
                title={collapsedGroups[group.id] ? 'Expandir grupo' : 'Recolher grupo'}
                aria-label={collapsedGroups[group.id] ? 'Expandir grupo' : 'Recolher grupo'}
              >
                {collapsedGroups[group.id] ? '+' : '−'}
              </button>
            </div>

            {!collapsedGroups[group.id] && (
              <>
                {groupUsers.length === 0 && <p>Nenhum usuário encontrado para este grupo.</p>}

                {groupUsers.length > 0 && (
                  <div className="table-wrap">
                    <table className="list-table frequencia-table">
                      <thead>
                        <tr>
                          <th>Nome do Usuário</th>
                          <th>Idade</th>
                          <th>Grupo</th>
                          <th>Turno</th>
                          {weekDays.map((day) => (
                            <th key={day.key}>
                              <span>{day.label}</span>
                              {day.dateLabel && <small className="frequencia-dia-data">({day.dateLabel})</small>}
                            </th>
                          ))}
                          <th><span>Justificativa</span><small className="frequencia-dia-data"><strong>Falta</strong></small></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupUsers.map((user) => {
                          const key = frequencyKey(user.grupo_id, user.usuario_id)
                          const userHasAbsence = hasAbsence(user.grupo_id, user.usuario_id)
                          return (
                            <tr key={key}>
                              <td>{user.nome}</td>
                              <td>{user.idade}</td>
                              <td>{user.grupo_nome}</td>
                              <td>{user.turno}</td>
                              {WEEK_DAYS.map((day) => (
                                <td key={`${user.usuario_id}-${day.key}`}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(frequencias[key]?.[day.key])}
                                    onChange={() => onToggle(user.grupo_id, user.usuario_id, day.key)}
                                    disabled={!canManage}
                                    style={{ margin: 0 }}
                                  />
                                </td>
                              ))}
                              <td className="frequencia-justificativa-cell">
                                <button
                                  type="button"
                                  className={`frequencia-justificativa-button ${justificativas[key] ? 'has-value' : ''}`}
                                  onClick={() => openJustificationModal(user)}
                                  disabled={!userHasAbsence && !justificativas[key]}
                                  title={justificativas[key] ? 'Visualizar justificativa' : 'Justificar falta'}
                                  aria-label={justificativas[key] ? 'Visualizar justificativa' : 'Justificar falta'}
                                >
                                  {justificativas[key] ? '✓' : '✎'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="form-actions">
          <button type="button" onClick={onSave} disabled={loading || !usuarios.length || !canManage}>Salvar</button>
        </div>
      </div>

      {justificationModal && (
        <div className="modal-overlay" role="presentation" onClick={closeJustificationModal}>
          <div className="modal-card frequencia-justificativa-modal" role="dialog" aria-modal="true" aria-labelledby="frequencia-justificativa-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 id="frequencia-justificativa-title">Justificativa</h3>
                <p>{justificationModal.userName} · {justificationModal.groupName}</p>
              </div>
              <button type="button" className="modal-close" onClick={closeJustificationModal} aria-label="Fechar">×</button>
            </div>
            <div className="field">
              <label>JUSTIFICATIVA DA FALTA NA SEMANA</label>
              <textarea
                className="frequencia-justificativa"
                value={justificativas[justificationModal.key] || ''}
                onChange={(event) => onJustificationChange(justificationModal.groupId, justificationModal.userId, event.target.value)}
                maxLength={500}
                rows={6}
                placeholder={justificationModal.hasAbsence ? 'Descreva a justificativa da falta nesta semana' : 'Este usuário não possui faltas na semana'}
                disabled={!canManage || !justificationModal.hasAbsence}
              />
              <small className="frequencia-justificativa-counter">{(justificativas[justificationModal.key] || '').length}/500</small>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={closeJustificationModal}>Cancelar</button>
              {!!justificativas[justificationModal.key] && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={onDeleteJustification}
                  disabled={!canManage || deletingJustification}
                >
                  {deletingJustification ? 'Excluindo...' : 'Excluir justificativa'}
                </button>
              )}
              <button type="button" onClick={closeJustificationModal} disabled={!canManage || !justificationModal.hasAbsence || deletingJustification}>Concluir</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
