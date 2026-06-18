import { NavLink } from 'react-router-dom'
import { clearAuth, getAuth } from '../auth'

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function Layout({ children }) {
  const auth = getAuth()
  const permissions = auth?.permissions || []
  const profile = normalizeProfile(auth?.profile)
  const isSecretariaAdministrativa = ['secretaria administrativa', 'secretaria executiva'].includes(profile)
  const canManageAtendimentos = Boolean(auth?.is_admin) || ['coordenador', 'coordenadora', 'tecnico'].includes(profile)
  const canSeeUnits = Boolean(auth?.is_admin) || permissions.includes('units.read')
  const canSeeCollaborators = Boolean(auth?.is_admin) || permissions.includes('collaborators.read')
  const canSeeActivities = Boolean(auth?.is_admin) || permissions.includes('activities.read')
  const canSeeGroups = Boolean(auth?.is_admin) || permissions.includes('groups.read')
  const canSeeAtendimentos = canManageAtendimentos
  const canSeeUsuario = !isSecretariaAdministrativa
  const canSeeControle = !isSecretariaAdministrativa
  const canSeeAcompanhamento = !isSecretariaAdministrativa
  const brandName = auth?.social_unit_name || 'ACM'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/logo-acm-ymca.png" alt="ACM YMCA" />
          <span className="brand-product">{brandName}</span>
        </div>

        <div className="topbar-actions">
          <div className="user-card">
            <strong>{auth?.user_name || 'Usuário'}</strong>
            <span>{auth?.profile || 'Sem perfil'}</span>
          </div>

          <button className="btn btn-ghost" type="button" onClick={() => { clearAuth(); window.location.href = '/login' }}>Sair</button>
        </div>
      </header>

      <nav className="primary-nav">
        <div className="primary-nav-inner">
          <div className="nav-group">
            <NavLink to="/cadastros/unidade-social" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Cadastros
            </NavLink>
            <div className="sub-nav">
              {canSeeUnits && <NavLink to="/cadastros/unidade-social" className="sub-nav-item">Unidade social</NavLink>}
              {canSeeCollaborators && <NavLink to="/cadastros/colaboradores" className="sub-nav-item">Colaboradores</NavLink>}
              {canSeeUsuario && <NavLink to="/cadastros/usuario" className="sub-nav-item">Usuário</NavLink>}
              {!isSecretariaAdministrativa && canSeeGroups && <NavLink to="/cadastros/grupos" className="sub-nav-item">Grupo</NavLink>}
              {!isSecretariaAdministrativa && canSeeActivities && <NavLink to="/cadastros/atividades" className="sub-nav-item">Atividade</NavLink>}
            </div>
          </div>

          {canSeeControle && (
            <div className="nav-group">
              <NavLink
                to="/classificacao-grupo"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                Controle
              </NavLink>
              <div className="sub-nav">
                <NavLink to="/classificacao-grupo" className="sub-nav-item">Classificação por Grupo</NavLink>
                <NavLink to="/frequencia" className="sub-nav-item">Frequência</NavLink>
                {canSeeAtendimentos && <NavLink to="/atendimentos" className="sub-nav-item" onClick={() => window.dispatchEvent(new Event('atendimentos:list'))}>Atendimento</NavLink>}
              </div>
            </div>
          )}

          {canSeeAcompanhamento && (
            <NavLink to="/participantes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Acompanhamento
            </NavLink>
          )}
        </div>
      </nav>

      <main className="page-content">{children}</main>
    </div>
  )
}
