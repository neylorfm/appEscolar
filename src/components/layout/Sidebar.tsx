import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Calendar, Home, Settings, ChevronLeft, ChevronRight, LogOut, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useInstituicao } from "@/contexts/InstituicaoContext"

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
    path: "/configuracoes",
    name: "Configurações",
    icon: Settings,
  },
]

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(true)
  const { usuario, logout } = useAuth()
  const { configuracoes } = useInstituicao()

  return (
    <div
      className={cn(
        "hidden border-r bg-muted/40 transition-all duration-300 md:block relative",
        isExpanded ? "w-64 lg:w-72" : "w-[72px]",
        className
      )}
    >
      <div className="flex h-full max-h-screen flex-col">
        {/* Header / Logo Area */}
        <div className="flex h-14 lg:h-[60px] items-center border-b px-4 justify-between">
          <Link to="/" className={cn("flex items-center gap-3 overflow-hidden", !isExpanded && "justify-center w-full")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-primary text-primary-foreground shrink-0 border border-gray-200 shadow-inner">
              {configuracoes?.logo_url ? (
                <img src={configuracoes.logo_url} alt="Logo da Instituição" className="w-full h-full object-contain bg-white" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            {isExpanded && (
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight break-words whitespace-normal line-clamp-2" style={{ color: configuracoes?.cor_principal }}>
                  {configuracoes?.nome_instituicao || "Minha Instituição"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                  App Escolar
                </span>
              </div>
            )}
          </Link>
          
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
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-2">
            {routes.map((route) => {
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
        <div className="border-t p-2">
          <div className={cn("flex flex-col gap-2 p-2", isExpanded ? "items-start" : "items-center")}>
            {/* User Info */}
            <div className={cn("flex items-center gap-3 w-full", !isExpanded && "justify-center")}>
              <Avatar className="h-8 w-8 rounded-full border shrink-0">
                <AvatarImage src={usuario?.foto_url || ''} alt="Avatar do usuário" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {usuario?.nome_completo ? usuario.nome_completo.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isExpanded && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium leading-none truncate" title={usuario?.nome_completo || 'Sem Nome'}>
                    {usuario?.nome_completo || 'Sem Nome'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground truncate rounded-md mt-1" title={usuario?.papel}>
                    {usuario?.papel}
                  </span>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size={isExpanded ? "sm" : "icon"}
              className={cn("w-full mt-2 border-border/50 text-muted-foreground hover:text-foreground", !isExpanded && "h-8 w-8")}
              onClick={logout}
              title={!isExpanded ? "Sair" : undefined}
            >
              <LogOut className={cn("h-4 w-4 text-muted-foreground", isExpanded && "mr-2")} />
              {isExpanded && "Sair"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
