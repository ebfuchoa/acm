import { Link } from 'react-router-dom'

export function UnitSocialCard({ unit }) {
  const location = [unit.city, unit.state].filter(Boolean).join(' - ')

  return (
    <article className="unit-management-card">
      <div className="unit-management-logo-wrap">
        <img className="unit-management-logo" src="/logo-acm-ymca-transparent.png" alt="" />
      </div>
      <h3>{unit.name}</h3>
      {location && (
        <p className="unit-management-location" aria-label="Localização">
          <span aria-hidden="true">⌖</span>
          {location}
        </p>
      )}
      <Link className="unit-management-link" to={`/gestao-unidades/${unit.id}`}>
        Ver unidade
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
