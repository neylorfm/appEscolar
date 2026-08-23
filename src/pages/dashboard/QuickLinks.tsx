import { useState, useEffect } from "react"
import { 
  Link2, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  Users, 
  BarChart3, 
  ChevronRight, 
  Sparkles,
  ExternalLink
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { getQuickLinks, QuickLink, deleteQuickLink, upsertQuickLink } from "@/services/dashboard"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "react-router-dom"

export function QuickLinks() {
  const { usuario } = useAuth()
  const [links, setLinks] = useState<QuickLink[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Partial<QuickLink> | null>(null)
  
  const canManage = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'

  useEffect(() => {
    loadLinks()
  }, [])

  async function loadLinks() {
    try {
      const data = await getQuickLinks()
      setLinks(data)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleSave() {
    if (!editingLink?.titulo || !editingLink?.url) {
      toast.error("Preencha o título e a URL")
      return
    }

    try {
      await upsertQuickLink(editingLink)
      toast.success("Link salvo com sucesso")
      setIsModalOpen(false)
      loadLinks()
    } catch (error: any) {
      console.error("Erro ao salvar quicklink:", error)
      toast.error("Erro ao salvar link", {
        description: error?.message || "Verifique se a tabela quicklinks existe no banco de dados."
      })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este link?")) return
    try {
      await deleteQuickLink(id)
      toast.success("Link excluído")
      loadLinks()
    } catch (error: any) {
      console.error("Erro ao excluir quicklink:", error)
      toast.error("Erro ao excluir link", {
        description: error?.message || "Erro ao conectar com o banco de dados."
      })
    }
  }

  const DynamicIcon = ({ name, className }: { name: string | null, className?: string }) => {
    if (!name) return <ExternalLink className={className} />
    const Icon = (LucideIcons as any)[name]
    return Icon ? <Icon className={className} /> : <ExternalLink className={className} />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* CARD DE LINKS RÁPIDOS */}
      <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Link2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              Links Rápidos
            </CardTitle>
          </div>
          {canManage && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-semibold rounded-lg px-2.5 gap-1 shadow-2xs border-border/80 hover:bg-muted" 
              onClick={() => { setEditingLink({ icone: 'ExternalLink' }); setIsModalOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2">
            {/* Link Padrão 1: Calendário */}
            <Link 
              to="/calendario" 
              className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 hover:shadow-xs hover:bg-muted/20 transition-all group select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                    Calendário Acadêmico
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Eventos e feriados
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>

            {/* Link Padrão 2: Agendamentos */}
            <Link 
              to="/agendamentos" 
              className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 hover:shadow-xs hover:bg-muted/20 transition-all group select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                    Agendamentos & Salas
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Reserva de espaços
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>

            {/* Link Padrão 3: Avaliações */}
            <Link 
              to="/avaliacoes" 
              className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 hover:shadow-xs hover:bg-muted/20 transition-all group select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                    Avaliações & Notas
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Gabaritos e resultados
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>

            {/* Custom Links */}
            {links.map((link) => (
              <div key={link.id} className="relative group">
                <a 
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 hover:shadow-xs hover:bg-muted/20 transition-all select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-8">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <DynamicIcon name={link.icone} className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors truncate">
                        {link.titulo}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {link.url}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>
                
                {canManage && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/95 p-1 rounded-lg border border-border shadow-xs z-10">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); setEditingLink(link); setIsModalOpen(true); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.preventDefault(); handleDelete(link.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CARD INSTITUCIONAL: TRADIÇÃO & EXCELÊNCIA */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-xs bg-linear-to-br from-card via-muted/30 to-muted/10 p-5 group select-none">
        <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Tradição & Excelência</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          Promovendo educação de qualidade, organização e gestão pedagógica integrada.
        </p>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE LINK */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLink?.id ? "Editar Link" : "Novo Link Rápido"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título do Link *</Label>
              <Input id="titulo" placeholder="Ex: Portal do Professor, Secretaria..." value={editingLink?.titulo || ""} onChange={(e) => setEditingLink(prev => ({ ...prev, titulo: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">URL de Acesso *</Label>
              <Input id="url" placeholder="https://..." value={editingLink?.url || ""} onChange={(e) => setEditingLink(prev => ({ ...prev, url: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="icone">Nome do Ícone (Lucide)</Label>
              <div className="flex gap-2">
                <Input id="icone" placeholder="Book, Globe, Link, etc." value={editingLink?.icone || ""} onChange={(e) => setEditingLink(prev => ({ ...prev, icone: e.target.value }))} />
                <div className="h-10 w-10 rounded-lg border flex items-center justify-center bg-muted/30 shrink-0">
                  <DynamicIcon name={editingLink?.icone || null} className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

