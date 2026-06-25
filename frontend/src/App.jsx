import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/dashboard'
import { UnidadeSocialPage, UsuarioPage, AtividadesPage, GruposPage, InscricoesPage, ColaboradoresPage, CatalogoDoacoesPage } from './pages/cadastros'
import { AtendimentosPage, FrequenciaPage, RelatoriosPage, ParticipantesPage, AcompanhamentoUnidadePage } from './pages/gestao'
import { ClassificacaoGrupoPage } from './pages/classificacao/ClassificacaoGrupoPage'
import { RecebimentoDoacoesPage } from './pages/controle/RecebimentoDoacoesPage'
import { RegistroAtividadesDiariaPage } from './pages/controle/RegistroAtividadesDiariaPage'
import { GestaoUnidadeDetalhePage, GestaoUnidadesPage } from './pages/gestao-unidades'
import { LoginPage } from './pages/auth'
import { getAuth, isAuthenticated } from './auth'

function normalizeProfile(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function canAccessUnitManagement() {
  const auth = getAuth()
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['secretaria executiva', 'secretaria administrativa', 'administrador do sistema'].includes(profile)
}

function canAccessUnitFollowup() {
  const auth = getAuth()
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['coordenador', 'coordenadora', 'administrador do sistema'].includes(profile)
}

function canAccessDailyActivityRecord() {
  const auth = getAuth()
  const profile = normalizeProfile(auth?.profile)
  return Boolean(auth?.is_admin) || ['educador', 'educadora', 'administrador do sistema'].includes(profile)
}

function UnitManagementRoute({ children }) {
  if (!canAccessUnitManagement()) return <Navigate to="/" replace />
  return children
}

function UnitFollowupRoute({ children }) {
  if (!canAccessUnitFollowup()) return <Navigate to="/" replace />
  return children
}

function DailyActivityRecordRoute({ children }) {
  if (!canAccessDailyActivityRecord()) return <Navigate to="/" replace />
  return children
}

function DonationCatalogRoute({ children }) {
  if (!canAccessUnitManagement()) return <Navigate to="/" replace />
  return children
}

function DonationReceiptRoute({ children }) {
  if (!canAccessUnitManagement()) return <Navigate to="/" replace />
  return children
}

function ProtectedApp() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cadastros" element={<Navigate to="/cadastros/unidade-social" replace />} />
        <Route path="/cadastros/unidade-social" element={<UnidadeSocialPage />} />
        <Route path="/cadastros/usuario" element={<UsuarioPage />} />
        <Route path="/cadastros/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/cadastros/atividades" element={<AtividadesPage />} />
        <Route path="/cadastros/grupos" element={<GruposPage />} />
        <Route path="/cadastros/inscricoes" element={<InscricoesPage />} />
        <Route path="/cadastros/catalogo-doacoes" element={<DonationCatalogRoute><CatalogoDoacoesPage /></DonationCatalogRoute>} />
        <Route path="/classificacao-grupo" element={<ClassificacaoGrupoPage />} />
        <Route path="/frequencia" element={<FrequenciaPage />} />
        <Route path="/registro-atividades-diaria" element={<DailyActivityRecordRoute><RegistroAtividadesDiariaPage /></DailyActivityRecordRoute>} />
        <Route path="/recebimento-doacoes" element={<DonationReceiptRoute><RecebimentoDoacoesPage /></DonationReceiptRoute>} />
        <Route path="/atendimentos" element={<AtendimentosPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/participantes" element={<ParticipantesPage />} />
        <Route path="/acompanhamento-unidade" element={<UnitFollowupRoute><AcompanhamentoUnidadePage /></UnitFollowupRoute>} />
        <Route path="/gestao-unidades" element={<UnitManagementRoute><GestaoUnidadesPage /></UnitManagementRoute>} />
        <Route path="/gestao-unidades/:unitId" element={<UnitManagementRoute><GestaoUnidadeDetalhePage /></UnitManagementRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  )
}
