import { useState } from 'react'
import { api } from '../../api/client'
import { brToIsoDate } from '../../utils/dateBr'
import { DatePickerBr } from '../../components/DatePickerBr'

export function ParticipantesPage() {
  const [participant, setParticipant] = useState({ unit_id: '', full_name: '', birth_date: '', nis: '' })
  const [stage, setStage] = useState({ participant_id: '', stage: 'identificacao', data: '{}' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function createParticipant(e) {
    e.preventDefault()
    setError('')
    try {
      await api('/participantes', {
        method: 'POST',
        body: JSON.stringify({
          ...participant,
          birth_date: brToIsoDate(participant.birth_date),
          unit_id: Number(participant.unit_id),
        }),
      })
      setMessage('Pré-cadastro criado.')
    } catch (err) {
      setMessage('')
      setError(err.message)
    }
  }

  async function saveStage(e) {
    e.preventDefault()
    setError('')
    try {
      await api(`/participantes/${Number(stage.participant_id)}/etapas`, {
        method: 'PUT',
        body: JSON.stringify({ stage: stage.stage, data: JSON.parse(stage.data) }),
      })
      setMessage('Etapa salva com sucesso.')
    } catch (err) {
      setMessage('')
      setError(err.message)
    }
  }

  return (
    <section>
      <h2>Cadastro Socioassistencial</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="grid">
        <form className="card" onSubmit={createParticipant}>
          <h3>Pré-cadastro</h3>
          <div className="field"><label>ID da unidade</label><input value={participant.unit_id} onChange={(e) => setParticipant({ ...participant, unit_id: e.target.value })} required /></div>
          <div className="field"><label>Nome completo</label><input value={participant.full_name} onChange={(e) => setParticipant({ ...participant, full_name: e.target.value })} required /></div>
          <div className="field">
            <DatePickerBr
              label="Data de nascimento"
              value={participant.birth_date}
              onChange={(v) => setParticipant({ ...participant, birth_date: v })}
              required
              disableFuture
            />
          </div>
          <div className="field"><label>NIS</label><input value={participant.nis} onChange={(e) => setParticipant({ ...participant, nis: e.target.value })} /></div>
          <button type="submit">Criar participante</button>
        </form>

        <form className="card" onSubmit={saveStage}>
          <h3>Salvar Etapa</h3>
          <div className="field"><label>ID participante</label><input value={stage.participant_id} onChange={(e) => setStage({ ...stage, participant_id: e.target.value })} required /></div>
          <div className="field"><label>Etapa</label><select value={stage.stage} onChange={(e) => setStage({ ...stage, stage: e.target.value })}><option value="identificacao">Identificação</option><option value="responsavel">Responsável</option><option value="endereco">Endereço</option><option value="escolaridade">Escolaridade</option><option value="autorizacoes">Autorizações</option><option value="parecer">Parecer</option></select></div>
          <div className="field"><label>Dados da etapa (JSON)</label><textarea value={stage.data} onChange={(e) => setStage({ ...stage, data: e.target.value })} required /></div>
          <button type="submit">Salvar Etapa</button>
        </form>
      </div>
    </section>
  )
}
