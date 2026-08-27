import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { ConfiguracoesLayout } from "./pages/configuracoes/ConfiguracoesLayout"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { InstituicaoProvider } from "./contexts/InstituicaoContext"
import { Login } from "./pages/login/Login"
import AreaPublicaPage from "./pages/public/AreaPublicaPage"
import Agendamentos from "./pages/agendamentos/Agendamentos"
import AvaliacoesList from "./pages/avaliacoes/AvaliacoesList"
import NovaAvaliacaoPage from "./pages/avaliacoes/NovaAvaliacaoPage"
import ConfigurarGabarito from "./pages/avaliacoes/ConfigurarGabarito"
import LancamentoResultadosPage from "./pages/avaliacoes/LancamentoResultadosPage"
import CalendarioView from "./pages/calendario/CalendarioView"
import { Toaster } from "./components/ui/sonner"
import { ThemeProvider } from "./components/ThemeProvider"

import { QuickLinks } from "./pages/dashboard/QuickLinks"
import { Avisos } from "./pages/dashboard/Avisos"
import QuadroHorariosPage from "./pages/horarios/QuadroHorariosPage"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse">
          Carregando ambiente escolar...
        </span>
      </div>
    )
  }
  
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth()
  
  if (usuario?.papel !== 'Administrador') {
    return <Navigate to="/links" replace />
  }
  
  return <>{children}</>
}

function LinksView() {
  const { usuario } = useAuth()
  
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Olá, {usuario?.nome_completo?.split(' ')[0] || 'Bem-vindo'}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base sm:text-lg font-medium">
          Confira os acessos rápidos e atalhos da instituição.
        </p>
      </div>
      
      <QuickLinks />
    </div>
  )
}

function AvisosView() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      <Avisos />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-escolar-theme">
      <BrowserRouter>
        <InstituicaoProvider>
          <AuthProvider>
            <Routes>
              {/* Página Inicial Pública (Sem necessidade de login) */}
              <Route path="/" element={<AreaPublicaPage />} />
              <Route path="/publico" element={<AreaPublicaPage />} />
              <Route path="/area-publica" element={<AreaPublicaPage />} />

              {/* Login dos Professores e Servidores */}
              <Route path="/login" element={<Login />} />
              
              {/* Ambiente Interno Autenticado */}
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/links" element={<LinksView />} />
                <Route path="/avisos" element={<AvisosView />} />
                <Route path="/horarios" element={<QuadroHorariosPage />} />
                <Route path="/agendamentos" element={<Agendamentos />} />
                <Route path="/avaliacoes">
                  <Route index element={<AvaliacoesList />} />
                  <Route path="nova" element={<NovaAvaliacaoPage />} />
                  <Route path=":id/gabarito" element={<ConfigurarGabarito />} />
                  <Route path=":id/resultados" element={<LancamentoResultadosPage />} />
                </Route>
                <Route path="/calendario" element={<CalendarioView />} />
                <Route path="/configuracoes" element={
                  <AdminRoute>
                    <ConfiguracoesLayout />
                  </AdminRoute>
                } />
              </Route>

              {/* Redirecionamento de rotas desconhecidas */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </InstituicaoProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
