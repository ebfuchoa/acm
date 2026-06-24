import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { getAuth } from '../../auth'

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

function currentYearOptions() {
  const year = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, index) => year - index)
}

function numberValue(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function maxFrom(items, keys) {
  return Math.max(1, ...items.flatMap((item) => keys.map((key) => numberValue(item[key]))))
}

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canAccessFollowup(auth) {
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['coordenador', 'coordenadora', 'administrador do sistema'].includes(profile)
}

function StatCard({ tone, title, value, caption }) {
  return (
    <article className={`followup-stat-card ${tone || ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  )
}

function MiniMetric({ title, value, tone }) {
  return (
    <div className={`followup-mini-metric ${tone || ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

function BarChart({ items }) {
  const max = maxFrom(items, ['children_entries', 'children_exits', 'teen_entries', 'teen_exits'])
  return (
    <div className="followup-bars" aria-label="Movimentação mensal">
      {items.map((item) => (
        <div className="followup-bar-month" key={item.month}>
          <div className="followup-bar-stack">
            <i className="green" style={{ height: `${(numberValue(item.children_entries) / max) * 100}%` }} title={`Entradas crianças: ${item.children_entries}`} />
            <i className="red" style={{ height: `${(numberValue(item.children_exits) / max) * 100}%` }} title={`Saídas crianças: ${item.children_exits}`} />
            <i className="purple" style={{ height: `${(numberValue(item.teen_entries) / max) * 100}%` }} title={`Entradas adolescentes: ${item.teen_entries}`} />
            <i className="orange" style={{ height: `${(numberValue(item.teen_exits) / max) * 100}%` }} title={`Saídas adolescentes: ${item.teen_exits}`} />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function ActivityDonut({ items }) {
  const total = items.reduce((sum, item) => sum + numberValue(item.quantity), 0)
  let offset = 0
  const colors = ['#1fa878', '#266ddf', '#f5a623', '#7457d6', '#6b7c93']
  const background = items.length && total > 0
    ? `conic-gradient(${items.map((item, index) => {
      const start = offset
      const size = (numberValue(item.quantity) / total) * 100
      offset += size
      return `${colors[index % colors.length]} ${start}% ${offset}%`
    }).join(', ')})`
    : 'conic-gradient(#e8eef6 0% 100%)'
  return <div className="followup-donut" style={{ background }}><span>{total}</span></div>
}

function LineChart({ items }) {
  const max = maxFrom(items, ['total'])
  const step = Math.max(1, Math.ceil(max / 4))
  const scaleMax = step * 4
  const ticks = [scaleMax, step * 3, step * 2, step, 0]
  const points = items.map((item, index) => {
    const x = items.length <= 1 ? 0 : (index / (items.length - 1)) * 100
    const y = 100 - (numberValue(item.total) / scaleMax) * 82 - 8
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="followup-line-section">
      <h4>Evolução de atendimentos por Mês</h4>
      <div className="followup-line-wrap">
        <div className="followup-y-axis" aria-hidden="true">
          {ticks.map((tick) => <span key={tick}>{tick}</span>)}
        </div>
        <svg className="followup-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Evolução mensal dos atendimentos">
          <g className="followup-grid-lines">
            {[8, 28.5, 49, 69.5, 90].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} />)}
          </g>
          <polyline points={points} fill="none" stroke="#1b609b" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
          {items.map((item, index) => {
            const x = items.length <= 1 ? 0 : (index / (items.length - 1)) * 100
            const y = 100 - (numberValue(item.total) / scaleMax) * 82 - 8
            return <circle key={item.month} cx={x} cy={y} r="1.7" fill="#1b609b" vectorEffect="non-scaling-stroke" />
          })}
        </svg>
      </div>
      <div className="followup-line-months" aria-hidden="true">
        {items.map((item) => <span key={item.month}>{item.label}</span>)}
      </div>
    </div>
  )
}

export function AcompanhamentoUnidadePage() {
  const auth = getAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [unitId, setUnitId] = useState(auth?.social_unit_id ? String(auth.social_unit_id) : '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canAccess = canAccessFollowup(auth)
  const years = useMemo(() => currentYearOptions(), [])

  async function loadDashboard() {
    if (!canAccess) return
    try {
      setLoading(true)
      const params = new URLSearchParams({ mes: String(month), ano: String(year) })
      if (unitId) params.set('unidade_id', unitId)
      const result = await api(`/acompanhamento/dashboard?${params.toString()}`)
      setData(result)
      if (!unitId && result.unit?.id) setUnitId(String(result.unit.id))
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (!canAccess) {
    return <section className="card"><p className="error">Acesso permitido apenas para Coordenadora e Administrador do Sistema.</p></section>
  }

  const cards = data?.cards || {}
  const movements = data?.age_movements || { children: {}, teens: {} }
  const monthly = data?.monthly_movement?.items || []
  const annualTotals = data?.monthly_movement?.annual_totals || {}
  const activities = data?.activities?.items || []
  const attendances = data?.attendances || {}
  const meetings = data?.family_meetings || {}
  const donations = data?.donations || {}
  const alerts = data?.alerts || []

  return (
    <section className="followup-page">
      <div className="followup-header">
        <div>
          <span className="unit-management-kicker">Painel gerencial</span>
          <h2>Acompanhamento da Unidade</h2>
          <p>Painel gerencial da unidade social</p>
        </div>
      </div>

      <div className="card followup-filter-card">
        <div className="field">
          <label>UNIDADE SOCIAL</label>
          <select value={unitId} onChange={(event) => setUnitId(event.target.value)} disabled={loading || (data?.available_units || []).length <= 1}>
            {(data?.available_units || []).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>MÊS</label>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))} disabled={loading}>
            {MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>ANO</label>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} disabled={loading}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <button type="button" className="btn" onClick={loadDashboard} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar Indicadores'}</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card followup-stat-panel">
        <div className="followup-stat-grid">
          <StatCard tone="green" title="Crianças Ativas" value={cards.children_active || 0} caption="6 a 11 anos" />
          <StatCard tone="purple" title="Adolescentes Ativos" value={cards.teens_active || 0} caption="12 a 15 anos" />
          <StatCard tone="blue" title="Atendimentos no Mês" value={cards.attendance_month || 0} caption="Total de atendimentos" />
          <StatCard tone="orange" title="Encontro com família" value={cards.families_in_meetings || 0} caption="Participantes" />
          <StatCard tone="teal" title="Doações Recebidas" value={cards.donations_received || 0} caption="Total de doações" />
        </div>
      </div>

      <div className="followup-grid two-columns">
        <article className="card followup-panel">
          <h3>Entradas e Saídas por Faixa Etária</h3>
          <div className="followup-split followup-age-stack">
            <div className="followup-age-group children">
              <h4>Crianças (6 a 11 anos)</h4>
              <MiniMetric title="Entradas" value={movements.children?.entries || 0} tone="green" />
              <MiniMetric title="Saídas" value={movements.children?.exits || 0} tone="red" />
            </div>
            <div className="followup-age-group teens">
              <h4>Adolescentes (12 a 15 anos)</h4>
              <MiniMetric title="Entradas" value={movements.teens?.entries || 0} tone="purple" />
              <MiniMetric title="Saídas" value={movements.teens?.exits || 0} tone="orange" />
            </div>
          </div>
        </article>

        <article className="card followup-panel">
          <h3>Movimentação mensal</h3>
          <div className="followup-legend">
            <span className="green">Entradas 6 a 11</span><span className="red">Saídas 6 a 11</span>
            <span className="purple">Entradas 12 a 15</span><span className="orange">Saídas 12 a 15</span>
          </div>
          <BarChart items={monthly} />
          <div className="followup-summary-row">
            <MiniMetric title="Entradas crianças no ano" value={annualTotals.children_entries || 0} tone="green" />
            <MiniMetric title="Saídas crianças no ano" value={annualTotals.children_exits || 0} tone="red" />
            <MiniMetric title="Entradas adolescentes no ano" value={annualTotals.teen_entries || 0} tone="purple" />
            <MiniMetric title="Saídas adolescentes no ano" value={annualTotals.teen_exits || 0} tone="orange" />
          </div>
        </article>
      </div>

      <div className="followup-grid two-columns">
        <article className="card followup-panel">
          <h3>Atividades Realizadas no Mês</h3>
          <div className="followup-activity-layout">
            <ActivityDonut items={activities} />
            <table className="followup-table">
              <thead><tr><th>Tipo de Atividade</th><th>Quantidade</th></tr></thead>
              <tbody>
                {activities.map((item) => <tr key={item.type}><td>{item.type}</td><td>{item.quantity}</td></tr>)}
                <tr><th>Total Geral</th><th>{data?.activities?.total || 0}</th></tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="card followup-panel">
          <h3>Atendimentos</h3>
          <div className="followup-summary-row followup-attendance-cards">
            <MiniMetric title="Atendimentos do mês" value={attendances.month_total || 0} tone="blue" />
            <MiniMetric title="Média diária" value={attendances.daily_average || 0} tone="blue" />
            <MiniMetric title="Total no ano" value={attendances.year_total || 0} tone="blue" />
          </div>
          <LineChart items={attendances.monthly || []} />
        </article>
      </div>

      <div className="followup-grid two-columns">
        <article className="card followup-panel">
          <h3>Encontro com Famílias</h3>
          <div className="followup-summary-row followup-meeting-cards">
            <MiniMetric title="Reuniões realizadas" value={meetings.total_meetings || 0} tone="purple" />
            <MiniMetric title="Famílias participantes" value={meetings.families_total || 0} tone="purple" />
            <MiniMetric title="Média por reunião" value={meetings.average_per_meeting || 0} tone="purple" />
          </div>
          <table className="followup-table">
            <thead><tr><th>Data</th><th>Tema</th><th>Famílias</th></tr></thead>
            <tbody>
              {(meetings.items || []).length === 0 && <tr><td colSpan={3}>Nenhuma reunião familiar encontrada.</td></tr>}
              {(meetings.items || []).map((item) => <tr key={`${item.date}-${item.theme}`}><td>{item.date}</td><td>{item.theme}</td><td>{item.families}</td></tr>)}
            </tbody>
          </table>
        </article>

        <article className="card followup-panel">
          <h3>Doações Recebidas no Mês</h3>
          <div className="followup-summary-row followup-donation-cards">
            <MiniMetric title="Total de doações" value={donations.total_donations || 0} tone="teal" />
            <MiniMetric title="Total de itens" value={donations.total_items || 0} tone="teal" />
            <MiniMetric title="Total em kg" value={donations.total_kg || 0} tone="teal" />
          </div>
          <table className="followup-table">
            <thead><tr><th>Tipo de Doação</th><th>Quantidade</th></tr></thead>
            <tbody>
              {(donations.by_type || []).length === 0 && <tr><td colSpan={2}>Nenhuma doação encontrada.</td></tr>}
              {(donations.by_type || []).map((item) => <tr key={item.type}><td>{item.type}</td><td>{item.quantity}</td></tr>)}
            </tbody>
          </table>
        </article>
      </div>

      <article className="card followup-panel">
        <h3>Alertas e Indicadores</h3>
        <div className="followup-alert-grid">
          {alerts.map((alert) => (
            <div className={`followup-alert ${alert.type}`} key={`${alert.title}-${alert.message}`}>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
