import { NavLink, useLocation } from 'react-router-dom'
import { clearAuth, getAuth, getDisplayUnitName } from '../auth'

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function openListView(eventName) {
  window.dispatchEvent(new Event(`${eventName}:list`))
}

export function Layout({ children }) {
  const location = useLocation()
  const auth = getAuth()
  const permissions = auth?.permissions || []
  const profile = normalizeProfile(auth?.profile)
  const isSecretariaAdministrativa = ['secretaria administrativa', 'secretaria executiva'].includes(profile)
  const canAccessUnitManagement = Boolean(auth?.is_admin) || ['secretaria executiva', 'secretaria administrativa', 'administrador do sistema'].includes(profile)
  const canManageAtendimentos = Boolean(auth?.is_admin) || ['coordenador', 'coordenadora', 'tecnico'].includes(profile)
  const canSeeUnits = Boolean(auth?.is_admin) || permissions.includes('units.read')
  const canSeeCollaborators = Boolean(auth?.is_admin) || permissions.includes('collaborators.read')
  const canSeeActivities = Boolean(auth?.is_admin) || permissions.includes('activities.read')
  const canSeeGroups = Boolean(auth?.is_admin) || permissions.includes('groups.read')
  const canSeeAtendimentos = canManageAtendimentos
  const canSeeUsuario = !isSecretariaAdministrativa
  const canSeeControle = !isSecretariaAdministrativa || canAccessUnitManagement
  const canSeeAcompanhamento = !isSecretariaAdministrativa
  const canSeeUnitFollowup = Boolean(auth?.is_admin) || ['coordenador', 'coordenadora', 'administrador do sistema'].includes(profile)
  const brandName = getDisplayUnitName(auth)
  const currentPath = location.pathname
  const isCadastrosActive = currentPath.startsWith('/cadastros')
  const isControleActive = currentPath.startsWith('/classificacao-grupo')
    || currentPath.startsWith('/frequencia')
    || currentPath.startsWith('/atendimentos')
    || currentPath.startsWith('/recebimento-doacoes')
  const isAcompanhamentoActive = currentPath.startsWith('/participantes')
    || currentPath.startsWith('/acompanhamento-unidade')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <NavLink to="/" className="brand-logo-link" aria-label="Ir para a tela inicial">
            <img className="brand-logo" src="/logo-acm-nos-somos.jpg" alt="ACM YMCA" />
          </NavLink>
        </div>

        <div className="topbar-actions">
          <div className="user-card">
            <strong className="user-unit">{brandName}</strong>
            <strong>{auth?.user_name || 'Usuário'}</strong>
            <span>{auth?.profile || 'Sem perfil'}</span>
          </div>

          <button className="btn btn-ghost" type="button" onClick={() => { clearAuth(); window.location.href = '/login' }}>Sair</button>
        </div>
      </header>

      <nav className="primary-nav">
        <div className="primary-nav-inner">
          <div className="nav-group">
            <button type="button" className={`nav-item nav-trigger ${isCadastrosActive ? 'active' : ''}`} aria-haspopup="true">
              Cadastros
            </button>
            <div className="sub-nav">
              {canSeeUnits && <NavLink to="/cadastros/unidade-social" className="sub-nav-item" onClick={() => openListView('unidade-social')}>Unidade social</NavLink>}
              {canSeeCollaborators && <NavLink to="/cadastros/colaboradores" className="sub-nav-item" onClick={() => openListView('colaboradores')}>Colaboradores</NavLink>}
              {canSeeUsuario && <NavLink to="/cadastros/usuario" className="sub-nav-item" onClick={() => openListView('usuarios')}>Usuário</NavLink>}
              {!isSecretariaAdministrativa && canSeeGroups && <NavLink to="/cadastros/grupos" className="sub-nav-item" onClick={() => openListView('grupos')}>Grupo</NavLink>}
              {!isSecretariaAdministrativa && canSeeActivities && <NavLink to="/cadastros/atividades" className="sub-nav-item" onClick={() => openListView('atividades')}>Atividade</NavLink>}
              {canAccessUnitManagement && <NavLink to="/cadastros/catalogo-doacoes" className="sub-nav-item" onClick={() => openListView('catalogo-doacoes')}>Catálogo de doação</NavLink>}
            </div>
          </div>

          {canSeeControle && (
            <div className="nav-group">
              <button type="button" className={`nav-item nav-trigger ${isControleActive ? 'active' : ''}`} aria-haspopup="true">
                Controle
              </button>
              <div className="sub-nav">
                {!isSecretariaAdministrativa && <NavLink to="/classificacao-grupo" className="sub-nav-item">Classificação por Grupo</NavLink>}
                {!isSecretariaAdministrativa && <NavLink to="/frequencia" className="sub-nav-item">Frequência</NavLink>}
                {canSeeAtendimentos && <NavLink to="/atendimentos" className="sub-nav-item" onClick={() => openListView('atendimentos')}>Atendimento</NavLink>}
                {canAccessUnitManagement && <NavLink to="/recebimento-doacoes" className="sub-nav-item" onClick={() => openListView('recebimento-doacoes')}>Recebimento de Doações</NavLink>}
              </div>
            </div>
          )}

          {(canSeeAcompanhamento || canSeeUnitFollowup) && (
            <div className="nav-group">
              <button type="button" className={`nav-item nav-trigger ${isAcompanhamentoActive ? 'active' : ''}`} aria-haspopup="true">
                Acompanhamento
              </button>
              <div className="sub-nav">
                {canSeeUnitFollowup && <NavLink to="/acompanhamento-unidade" className="sub-nav-item">Acompanhamento da Unidade</NavLink>}
                {canSeeAcompanhamento && <NavLink to="/participantes" className="sub-nav-item">Participantes</NavLink>}
              </div>
            </div>
          )}

          {canAccessUnitManagement && (
            <NavLink to="/gestao-unidades" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Gestão de Unidades
            </NavLink>
          )}
        </div>
      </nav>

      <main className="page-content">{children}</main>
    </div>
  )
}
