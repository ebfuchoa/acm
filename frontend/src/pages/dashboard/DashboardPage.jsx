import { getAuth, getDisplayUnitTitle } from '../../auth'

const institutionalValues = [
  {
    name: 'Honestidade',
    text: 'Atuamos com transparência, ética e integridade em todas as nossas relações, fortalecendo a confiança entre colaboradores, usuários, parceiros e a comunidade.',
  },
  {
    name: 'Respeito',
    text: 'Promovemos ambientes inclusivos, seguros e acolhedores, valorizando a diversidade cultural, social, religiosa e as individualidades de cada pessoa.',
  },
  {
    name: 'Responsabilidade',
    text: 'Assumimos o compromisso com o desenvolvimento pessoal e coletivo, incentivando a autonomia, o protagonismo, a cidadania e a corresponsabilidade social.',
  },
  {
    name: 'Solidariedade',
    text: 'Orientamos nossas ações pelo cuidado com o próximo, promovendo a inclusão social e o apoio às populações em situação de vulnerabilidade, contribuindo para uma sociedade mais justa e humana.',
  },
]

export function DashboardPage() {
  const auth = getAuth()
  const unitTitle = getDisplayUnitTitle(auth)

  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <div className="dashboard-hero-content">
        <div className="dashboard-kicker">
          <span>Painel operacional</span>
        </div>

        <h1 id="dashboard-title">{unitTitle}</h1>

        <div className="dashboard-mission" aria-label="Missão">
          <p><strong>Missão</strong> - Fortalecer pessoas, Famílias e Comunidades</p>
        </div>

        <div className="dashboard-values" aria-label="Valores Institucionais">
          <h2>Valores Institucionais</h2>
          <div className="dashboard-values-grid">
            {institutionalValues.map((value) => (
              <article key={value.name}>
                <strong>{value.name}</strong>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
