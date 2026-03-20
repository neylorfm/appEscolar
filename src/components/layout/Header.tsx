import { Menu, LogOut, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Link, useLocation } from "react-router-dom"
import { Calendar, Home, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useInstituicao } from "@/contexts/InstituicaoContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import { UserProfileModal } from "@/components/usuarios/UserProfileModal"

const routes = [
  { path: "/", name: "Dashboard", icon: Home },
  { path: "/agendamentos", name: "Agendamentos", icon: Calendar },
  { path: "/configuracoes", name: "Configurações", icon: Settings },
]

export function Header() {
  const location = useLocation()
  const { usuario, logout } = useAuth()
  const { configuracoes } = useInstituicao()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden lg:h-[60px] lg:px-6 shadow-sm sticky top-0 z-30">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden -ml-2 text-muted-foreground hover:bg-muted"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col w-[85%] max-w-[320px] p-0 border-r-0">
          <div className="flex flex-col h-full overflow-hidden bg-background">
            <div className="flex h-16 items-center border-b px-4 gap-3 bg-muted/10 shadow-sm">
              <SheetTitle className="sr-only">Navegação Mobile</SheetTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-primary text-primary-foreground shrink-0 border border-border/50 shadow-inner">
                {configuracoes?.logo_url ? (
                  <img src={configuracoes.logo_url} alt="Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight line-clamp-2" style={{ color: configuracoes?.cor_principal }}>
                  {configuracoes?.nome_instituicao || "App Escolar"}
                </span>
              </div>
            </div>

            <nav className="flex-1 overflow-auto py-4 px-3 grid gap-1">
              {routes.map((route) => {
                if (route.path === "/configuracoes" && usuario?.papel !== 'Administrador') {
                  return null
                }

                const isActive = location.pathname === route.path
                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors group",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <route.icon className={cn("h-5 w-5 shrink-0", !isActive && "opacity-80 group-hover:opacity-100")} />
                    <span className="text-base tracking-wide">{route.name}</span>
                  </Link>
                )
              })}
              
              <div className="my-2 border-t border-border/50"></div>

              <div 
                className="flex items-center gap-3 w-full rounded-xl p-2.5 transition-colors hover:bg-muted cursor-pointer mb-1 border border-transparent hover:border-border/50"
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileModalOpen(true);
                }}
              >
                <Avatar className="h-10 w-10 border bg-background shadow-sm shrink-0">
                  <AvatarImage src={usuario?.foto_url || ''} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {usuario?.nome_completo ? usuario.nome_completo.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden w-full">
                  <span className="text-sm font-bold truncate leading-none mb-1 text-foreground">
                    {usuario?.nome_completo || 'Sem Nome'}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate uppercase font-bold">
                    {usuario?.apelido || usuario?.papel}
                  </span>
                </div>
              </div>
              
              <button
                className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-destructive/10 text-destructive/80 hover:text-destructive cursor-pointer font-medium w-full text-left"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-base tracking-wide">Sair da Conta</span>
              </button>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
      
      <div className="flex-1 flex justify-center md:hidden pointer-events-none">
         <span className="font-bold text-sm truncate tracking-tight" style={{ color: configuracoes?.cor_principal }}>
           {configuracoes?.nome_instituicao || "App Escolar"}
         </span>
      </div>
      
      <div className="w-8 shrink-0 md:hidden" /> {/* Spacer para centralizar o titulo */}

      <UserProfileModal 
         isOpen={isProfileModalOpen} 
         onClose={() => setIsProfileModalOpen(false)} 
      />
    </header>
  )
}
