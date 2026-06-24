import { useEffect, useState } from 'react'
import { UnitSocialCard } from '../../components/units/UnitSocialCard'
import { listManagedUnits } from '../../services/unitManagementService'

export function GestaoUnidadesPage() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadUnits() {
      try {
        setLoading(true)
        const data = await listManagedUnits()
        if (active) {
          setUnits(data)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadUnits()
    return () => { active = false }
  }, [])

  return (
    <section>
      <div className="unit-management-header">
        <h2>Unidades Sociais</h2>
        <p>Selecione uma unidade social para visualizar suas informações institucionais.</p>
      </div>

      {loading && <div className="card"><p>Carregando unidades sociais...</p></div>}
      {!loading && error && <p className="error">{error}</p>}
      {!loading && !error && units.length === 0 && (
        <div className="card empty-state">
          <p>Nenhuma unidade social encontrada.</p>
        </div>
      )}
      {!loading && !error && units.length > 0 && (
        <div className="card unit-management-panel">
          <div className="unit-management-grid">
            {units.map((unit) => <UnitSocialCard key={unit.id} unit={unit} />)}
          </div>
        </div>
      )}
    </section>
  )
}
