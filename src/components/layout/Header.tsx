import { Menu, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Link, useLocation } from "react-router-dom"
import { Calendar, Home, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
  { path: "/", name: "Dashboard", icon: Home },
  { path: "/agendamentos", name: "Agendamentos", icon: Calendar },
  { path: "/configuracoes", name: "Configurações", icon: Settings },
]

export function Header() {
  const location = useLocation()

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 md:hidden lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium mt-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-lg font-semibold mb-4"
            >
              <span className="">App Escolar</span>
            </Link>
            {routes.map((route) => {
              const isActive = location.pathname === route.path
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2",
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <route.icon className="h-5 w-5" />
                  {route.name}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
      
      <div className="w-full flex-1">
        {/* Placeholder for Search or Title */}
      </div>
      
      <Button variant="ghost" size="icon" className="rounded-full">
        <UserCircle className="h-5 w-5" />
        <span className="sr-only">Toggle user menu</span>
      </Button>
    </header>
  )
}
