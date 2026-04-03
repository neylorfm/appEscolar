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

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Settings, Eye } from "lucide-react"
import { Link } from "react-router-dom"

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo ao App Escolar. Selecione um módulo abaixo.</p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
             <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600 mb-4">
               <CalendarIcon className="h-6 w-6" />
             </div>
             <CardTitle className="text-xl">Calendário Acadêmico</CardTitle>
             <CardDescription className="pt-2">
               Versão atualizada do calendário escolar com eventos e períodos letivos.
             </CardDescription>
          </CardHeader>
          <div className="flex-1" />
          <div className="flex w-full items-center gap-4 border-t px-5 py-3 text-sm font-semibold text-slate-600">
             <Link to="/calendario" className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                Visualizar
                <Eye className="h-3.5 w-3.5" />
             </Link>
             
             {(usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador') && (
               <>
                 <div className="h-4 w-px bg-slate-200" />
                 <Link to="/calendario?manage=true" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
                   Gerenciar
                   <Settings className="h-3.5 w-3.5" />
                 </Link>
               </>
             )}
          </div>
        </Card>
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
