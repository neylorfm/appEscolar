import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Usuario } from '../services/usuarios'
import { useInstituicao } from './InstituicaoContext'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  usuario: Usuario | null
  loading: boolean
  logout: () => Promise<void>
  inactiveError: boolean
  clearInactiveError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [inactiveError, setInactiveError] = useState(false)
  const { configuracoes } = useInstituicao()
  const navigate = useNavigate()
  
  // Timer for idle timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    navigate('/login')
  }, [navigate])

  const resetIdleTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    if (usuario && configuracoes) {
      let timeoutMin = 60 // Padrao fallback
      switch (usuario.papel) {
        case 'Administrador':
           timeoutMin = configuracoes.timeout_administrador_min
           break
        case 'Coordenador':
           timeoutMin = configuracoes.timeout_coordenador_min
           break
        case 'Professor':
           timeoutMin = configuracoes.timeout_professor_min
           break
      }
      
      const timeoutMs = timeoutMin * 60 * 1000
      timeoutRef.current = setTimeout(() => {
        logout()
      }, timeoutMs)
    }
  }, [usuario, configuracoes, logout])

  useEffect(() => {
    // Escutar eventos de atividade na tela para resetar o timer
    const handleActivity = () => {
      resetIdleTimer()
    }

    if (usuario) {
       window.addEventListener('mousemove', handleActivity)
       window.addEventListener('keydown', handleActivity)
       window.addEventListener('click', handleActivity)
       window.addEventListener('scroll', handleActivity)
       resetIdleTimer() // Start timer initially
    }

    return () => {
       if (timeoutRef.current) clearTimeout(timeoutRef.current)
       window.removeEventListener('mousemove', handleActivity)
       window.removeEventListener('keydown', handleActivity)
       window.removeEventListener('click', handleActivity)
       window.removeEventListener('scroll', handleActivity)
    }
  }, [usuario, configuracoes, resetIdleTimer])


  useEffect(() => {
    let isMounted = true
    const timeoutFallback = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 6000) // Fallback de segurança para não travar tela caso o Supabase demore a responder

    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single()
           
        if (error) {
          console.error('Error fetching user profile:', error)
        }
           
        if (data && isMounted) {
          const u = data as Usuario
          if (u.ativo === false) {
            console.warn('Usuário inativo, deslogando...')
            setInactiveError(true)
            logout()
          } else {
            setUsuario(u)
          }
        }
      } catch (err) {
        console.error('Falha ao obter perfil de usuário:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
          clearTimeout(timeoutFallback)
        }
      }
    }

    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && isMounted) {
          await fetchUserProfile(session.user.id)
        } else if (isMounted) {
          setLoading(false)
          clearTimeout(timeoutFallback)
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err)
        if (isMounted) {
          setLoading(false)
          clearTimeout(timeoutFallback)
        }
      }
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      
      if (session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          fetchUserProfile(session.user.id)
        }
      } else {
        setUsuario(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutFallback)
      subscription.unsubscribe()
    }
  }, [navigate, logout])

  const clearInactiveError = () => {
    setInactiveError(false)
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, logout, inactiveError, clearInactiveError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
