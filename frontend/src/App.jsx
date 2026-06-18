import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/dashboard'
import { UnidadeSocialPage, UsuarioPage, AtividadesPage, GruposPage, InscricoesPage, ColaboradoresPage } from './pages/cadastros'
import { AtendimentosPage, FrequenciaPage, RelatoriosPage, ParticipantesPage } from './pages/gestao'
import { ClassificacaoGrupoPage } from './pages/classificacao/ClassificacaoGrupoPage'
import { LoginPage } from './pages/auth'
import { isAuthenticated } from './auth'

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
        <Route path="/classificacao-grupo" element={<ClassificacaoGrupoPage />} />
        <Route path="/frequencia" element={<FrequenciaPage />} />
        <Route path="/atendimentos" element={<AtendimentosPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/participantes" element={<ParticipantesPage />} />
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
