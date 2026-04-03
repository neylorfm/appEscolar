import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { ConfiguracoesLayout } from "./pages/configuracoes/ConfiguracoesLayout"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { InstituicaoProvider } from "./contexts/InstituicaoContext"
import { Login } from "./pages/login/Login"
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth()
  
  if (usuario?.papel !== 'Administrador') {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

function Dashboard() {
  const { usuario } = useAuth()
  
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Olá, {usuario?.nome_completo?.split(' ')[0] || 'Bem-vindo'}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">
          Confira os destaques e acessos rápidos de hoje.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Coluna de Conteúdo Principal (Avisos) */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Avisos />
        </div>

        {/* Coluna Lateral (QuickLinks) */}
        <div className="order-1 lg:order-2 flex flex-col gap-6">
          <QuickLinks />
        </div>
      </div>
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
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="agendamentos" element={<Agendamentos />} />
                <Route path="avaliacoes">
                  <Route index element={<AvaliacoesList />} />
                  <Route path="nova" element={<NovaAvaliacaoPage />} />
                  <Route path=":id/gabarito" element={<ConfigurarGabarito />} />
                  <Route path=":id/resultados" element={<LancamentoResultadosPage />} />
                </Route>
                <Route path="calendario">
                  <Route index element={<CalendarioView />} />
                </Route>
                <Route path="configuracoes" element={
                  <AdminRoute>
                    <ConfiguracoesLayout />
                  </AdminRoute>
                } />
              </Route>
            </Routes>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </InstituicaoProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
