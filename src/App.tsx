import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { ConfiguracoesLayout } from "./pages/configuracoes/ConfiguracoesLayout"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { InstituicaoProvider } from "./contexts/InstituicaoContext"
import { Login } from "./pages/login/Login"
import Agendamentos from "./pages/agendamentos/Agendamentos"
import { Toaster } from "./components/ui/sonner"

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
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">Bem-vindo ao App Escolar.</p>
    </div>
  )
}


function App() {
  return (
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
  )
}

export default App
