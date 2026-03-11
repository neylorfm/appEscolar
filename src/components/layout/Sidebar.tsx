import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Calendar, Home, Settings, ChevronLeft, ChevronRight, LogOut, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            {isExpanded && (
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight break-words whitespace-normal line-clamp-2">
                  EEMTI Antonieta Siqueira
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
                <AvatarImage src="" alt="Avatar do usuário" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">NM</AvatarFallback>
              </Avatar>
              
              {isExpanded && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium leading-none truncate" title="Neylor Farias Magalhães">
                    Neylor Farias Magalhães
                  </span>
                  <span className="text-xs text-muted-foreground truncate" title="neylor">
                    neylor
                  </span>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size={isExpanded ? "sm" : "icon"}
              className={cn("w-full mt-2 border-border/50 text-muted-foreground hover:text-foreground", !isExpanded && "h-8 w-8")}
              onClick={() => console.log("Sair clicado")}
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
