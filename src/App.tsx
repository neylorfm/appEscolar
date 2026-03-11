import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"

function Dashboard() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">Bem-vindo ao App Escolar.</p>
    </div>
  )
}

function DefaultPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">Página em construção.</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="agendamentos" element={<DefaultPage title="Agendamentos" />} />
          <Route path="configuracoes" element={<DefaultPage title="Configurações" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
