import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useInstituicao } from '@/contexts/InstituicaoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { AlertCircle } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { configuracoes } = useInstituicao()
  const { usuario, inactiveError, clearInactiveError } = useAuth()

  useEffect(() => {
    if (usuario) {
      navigate('/')
    }
  }, [usuario, navigate])

  useEffect(() => {
    if (inactiveError) {
      setLoading(false)
    }
  }, [inactiveError])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Customize error messages
        if (error.message.includes('Invalid login credentials')) {
           setError('E-mail ou senha incorretos.')
        } else {
           setError(error.message)
        }
        setLoading(false)
        return
      }

      // Successful login, redirection is handled by the useEffect above once usuario is loaded
    } catch {
      setError('Ocorreu um erro ao tentar fazer login.')
      setLoading(false)
    }
  }

  const logoUrl = configuracoes?.logo_url || '/vite.svg'
  const nomeInstituicao = configuracoes?.nome_instituicao || 'Carregando...'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8 gap-4">
          {/* Logo container */}
          <div className="h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 p-2 shadow-inner border border-gray-200">
            {configuracoes ? (
              <img 
                src={logoUrl} 
                alt="Logo da Instituição" 
                className="w-full h-full object-contain"
              />
            ) : (
               <div className="w-10 h-10 border-4 border-primary border-t-transparent border-solid rounded-full animate-spin"></div>
            )}
          </div>
          
          <div className="text-center">
             <h1 className="text-2xl font-bold tracking-tight text-gray-900" style={{ color: configuracoes?.cor_principal }}>
                {nomeInstituicao}
             </h1>
             <p className="text-sm text-muted-foreground mt-1">Faça login para acessar o sistema escolar</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-11"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-gray-700">Senha</Label>
              <span className="text-[11px] text-muted-foreground">
                Esqueceu a senha? <strong style={{ color: configuracoes?.cor_principal || 'inherit' }}>Procure a coordenação</strong>
              </span>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11"
            />
          </div>

          <Button 
             type="submit" 
             className="w-full h-11 text-base font-semibold" 
             disabled={loading}
             style={{ 
               backgroundColor: configuracoes?.cor_principal || 'var(--primary)',
               color: '#fff' 
             }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>

      <Dialog open={inactiveError} onOpenChange={(open) => {
         if (!open) clearInactiveError()
      }}>
        <DialogContent className="sm:max-w-[425px] flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
             <AlertCircle size={32} />
           </div>
           
           <DialogHeader>
             <DialogTitle className="text-xl text-center">Acesso Suspenso</DialogTitle>
             <DialogDescription className="text-center pt-2 text-base">
               Sua conta foi inativada ou suspensa pela administração e você não pode acessar o painel no momento.
               <br/><br/>
               Por favor, entre em contato imediatamente com a coordenação ou a administração da escola para regularizar o seu acesso.
             </DialogDescription>
           </DialogHeader>
           
           <DialogFooter className="mt-6 w-full flex-col sm:flex-col items-center gap-2">
              <Button 
                variant="default" 
                onClick={() => clearInactiveError()} 
                className="w-full h-11"
              >
                 Entendi, voltar ao login
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
