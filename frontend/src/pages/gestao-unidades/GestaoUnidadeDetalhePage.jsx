import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getManagedUnit } from '../../services/unitManagementService'

export function GestaoUnidadeDetalhePage() {
  const { unitId } = useParams()
  const [unit, setUnit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadUnit() {
      try {
        setLoading(true)
        const data = await getManagedUnit(unitId)
        if (active) {
          setUnit(data)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadUnit()
    return () => { active = false }
  }, [unitId])

  if (loading) return <section><div className="card"><p>Carregando unidade social...</p></div></section>
  if (error) return <section><p className="error">{error}</p></section>
  if (!unit) return <section><div className="card"><p>Unidade social não encontrada.</p></div></section>

  return (
    <section>
      <Link className="unit-management-back" to="/gestao-unidades">← Voltar para Gestão de Unidades</Link>
      <div className="card unit-detail-card">
        <img className="unit-detail-logo" src="/logo-acm-ymca-transparent.png" alt="" />
        <div>
          <span className="unit-management-kicker">Unidade Social</span>
          <h2>{unit.name}</h2>
          <p>{[unit.city, unit.state].filter(Boolean).join(' - ')}</p>
        </div>
        <div className="unit-detail-grid">
          <div><strong>Endereço</strong><span>{unit.address}</span></div>
          <div><strong>Bairro</strong><span>{unit.district}</span></div>
          <div><strong>CEP</strong><span>{unit.zip_code}</span></div>
          <div><strong>Telefone</strong><span>{unit.phone}</span></div>
          <div><strong>E-mail</strong><span>{unit.email}</span></div>
          <div><strong>Tipo</strong><span>{unit.is_matrix ? 'Matriz' : 'Unidade Social'}</span></div>
        </div>
      </div>
    </section>
  )
}
