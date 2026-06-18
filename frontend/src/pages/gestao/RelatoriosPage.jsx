import { useState } from 'react'
import { api } from '../../api/client'

export function RelatoriosPage() {
  const [report, setReport] = useState({ unit_id: '', title: '', content: '{}' })
  const [review, setReview] = useState({ report_id: '', reviewer_name: '', decision: 'aprovado', reason: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function createReport(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...report, unit_id: Number(report.unit_id), content: JSON.parse(report.content) }
      const created = await api('/relatorios', { method: 'POST', body: JSON.stringify(payload) })
      setMessage(`Relatório ${created.id} criado com status ${created.status}`)
    } catch (err) {
      setMessage('')
      setError(err.message)
    }
  }

  async function reviewReport(e) {
    e.preventDefault()
    setError('')
    try {
      await api(`/relatorios/${Number(review.report_id)}/revisar`, {
        method: 'POST',
        body: JSON.stringify({ reviewer_name: review.reviewer_name, decision: review.decision, reason: review.reason || null }),
      })
      setMessage('Revisão de relatório aplicada.')
    } catch (err) {
      setMessage('')
      setError(err.message)
    }
  }

  return (
    <section>
      <h2>Relatórios Institucionais</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="grid">
        <form className="card" onSubmit={createReport}>
          <h3>Novo Relatório</h3>
          <div className="field"><label>ID da unidade</label><input placeholder="ID da unidade" value={report.unit_id} onChange={(e) => setReport({ ...report, unit_id: e.target.value })} required /></div>
          <div className="field"><label>Título</label><input placeholder="Título" value={report.title} onChange={(e) => setReport({ ...report, title: e.target.value })} required /></div>
          <div className="field"><label>Conteúdo (JSON)</label><textarea placeholder='Conteúdo JSON ex: {"resumo":"..."}' value={report.content} onChange={(e) => setReport({ ...report, content: e.target.value })} required /></div>
          <button type="submit">Criar</button>
        </form>

        <form className="card" onSubmit={reviewReport}>
          <h3>Aprovar/Reprovar</h3>
          <div className="field"><label>ID do relatório</label><input placeholder="ID do relatório" value={review.report_id} onChange={(e) => setReview({ ...review, report_id: e.target.value })} required /></div>
          <div className="field"><label>Revisor</label><input placeholder="Revisor" value={review.reviewer_name} onChange={(e) => setReview({ ...review, reviewer_name: e.target.value })} required /></div>
          <div className="field"><label>Decisão</label><select value={review.decision} onChange={(e) => setReview({ ...review, decision: e.target.value })}>
            <option value="aprovado">Aprovar</option>
            <option value="reprovado">Reprovar</option>
          </select></div>
          <div className="field"><label>Motivo</label><textarea placeholder="Motivo (obrigatório na reprovação)" value={review.reason} onChange={(e) => setReview({ ...review, reason: e.target.value })} /></div>
          <button type="submit">Aplicar decisão</button>
        </form>
      </div>
    </section>
  )
}



