import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Calendar, Home, Settings, ChevronLeft, ChevronRight, LogOut, Building2, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useInstituicao } from "@/contexts/InstituicaoContext"
import { UserProfileModal } from "@/components/usuarios/UserProfileModal"
import { ThemeToggle } from "@/components/ThemeToggle"

const routes = [
  {
    path: "/",
    name: "Dashboard",
    icon: Home,
  },
  {
    path: "/agendamentos",
    name: "Agendamentos",
    icon: Calendar,
  },
  {
    path: "/avaliacoes",
    name: "Avaliações",
    icon: FileText,
  },
  {
    path: "/configuracoes",
    name: "Configurações",
    icon: Settings,
  },
]

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const { usuario, logout } = useAuth()
  const { configuracoes } = useInstituicao()

  return (
    <>
      {/* Mobile Overlay for Expanded Sidebar */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden animate-in fade-in duration-200" 
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      <div
        className={cn(
          "fixed top-0 left-0 z-50 border-r bg-white dark:bg-slate-950 transition-all duration-300 shadow-sm",
          // Desktop behavior
          "md:relative md:h-screen",
          isExpanded 
            ? "w-[280px] h-[100dvh]" 
            : "w-[64px] h-[64px] md:h-screen md:w-[72px] m-4 md:m-0 rounded-2xl md:rounded-none border shadow-lg md:shadow-none",
          className
        )}
      >
      <div className="flex h-full max-h-[100dvh] flex-col">
        {/* Header / Logo Area */}
        <div className={cn(
          "flex h-[60px] shrink-0 items-center justify-between border-b px-4",
          !isExpanded && "border-b-0 px-0"
        )}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-3 overflow-hidden transition-all duration-300", 
              !isExpanded && "justify-center w-full"
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-primary text-primary-foreground shrink-0 border border-gray-200 shadow-inner">
              {configuracoes?.logo_url ? (
                <img src={configuracoes.logo_url} alt="Logo da Instituição" className="w-full h-full object-contain bg-white" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            {isExpanded && (
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm leading-tight break-words whitespace-normal line-clamp-2" style={{ color: configuracoes?.cor_principal }}>
                  {configuracoes?.nome_instituicao || "Minha Instituição"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                  App Escolar
                </span>
              </div>
            )}
          </button>
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute -right-3 top-4 h-6 w-6 rounded-full border bg-background shadow-md lg:top-5 hidden md:flex hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring z-10"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className={cn(
          "flex-1 overflow-y-auto py-4 transition-opacity duration-200 scrollbar-none",
          !isExpanded && "md:opacity-100 opacity-0 pointer-events-none md:pointer-events-auto"
        )}>
          <nav className="grid gap-1 px-2">
            {routes.map((route) => {
              // Only Administrador can see Settings
              if (route.path === "/configuracoes" && usuario?.papel !== 'Administrador') {
                return null
              }

              const isActive = location.pathname === route.path
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 transition-all group",
                    isExpanded ? "gap-3" : "justify-center",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  title={!isExpanded ? route.name : undefined}
                >
                  <route.icon className={cn("h-4 w-4 shrink-0", !isActive && "opacity-70 group-hover:opacity-100")} />
                  {isExpanded && (
                    <span className="text-sm font-medium">{route.name}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer / Profile Area */}
        <div className={cn(
          "border-t p-2 pb-6 shrink-0 transition-opacity duration-200",
          !isExpanded && "md:opacity-100 opacity-0 pointer-events-none md:pointer-events-auto"
        )}>
          <div className={cn("flex flex-col gap-1 p-1 pb-2", isExpanded ? "items-start" : "items-center")}>
            {/* Theme Toggle */}
            <div className={cn("flex items-center w-full mb-1", isExpanded ? "justify-between px-2" : "justify-center")} title="Alternar tema visual">
              {isExpanded && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Tema Visual</span>}
              <ThemeToggle />
            </div>
            
            {/* User Info (Clickable for Profile Edit) */}
            <div 
              className={cn(
                "flex items-center gap-2 w-full rounded-lg p-1.5 transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800", 
                !isExpanded && "justify-center"
              )}
              onClick={() => setIsProfileModalOpen(true)}
              title={isExpanded ? "Editar Perfil" : usuario?.nome_completo || 'Perfil'}
            >
              <Avatar className="h-7 w-7 rounded-full border shrink-0">
                <AvatarImage src={usuario?.foto_url || ''} alt="Avatar" />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {usuario?.nome_completo ? usuario.nome_completo.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isExpanded && (
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-xs font-bold leading-none truncate w-full" title={usuario?.nome_completo || 'Sem Nome'}>
                    {usuario?.nome_completo || 'Sem Nome'}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground truncate mt-0.5" title={usuario?.papel}>
                    {usuario?.apelido || usuario?.papel}
                  </span>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              className={cn(
                "flex items-center gap-2 w-full mt-1 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors",
                !isExpanded ? "justify-center" : "px-3"
              )}
              onClick={logout}
              title={!isExpanded ? "Sair" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="text-xs font-bold">Encerrar Sessão</span>}
            </button>
          </div>
        </div>
      </div>
      
      <UserProfileModal 
         isOpen={isProfileModalOpen} 
         onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
    </>
  )
}
