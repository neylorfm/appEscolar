import { useState, useEffect } from "react"
import { ExternalLink, Plus, Trash2, Edit2, Calendar, Clock } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
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
    } finally {
      setLoading(false)
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
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ExternalLink className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Links Rápidos</CardTitle>
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
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-2.5">
          {/* Default System Links */}
          <Link to="/calendario" className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-2xs transition-all group">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="font-bold text-foreground text-sm">Calendário Letivo</span>
          </Link>

          <Link to="/agendamentos" className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-2xs transition-all group">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <span className="font-bold text-foreground text-sm">Agendamentos</span>
          </Link>

          {/* Custom Links */}
          {links.map((link) => (
            <div key={link.id} className="relative group">
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-2xs transition-all group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <DynamicIcon name={link.icone} className="h-5 w-5" />
                </div>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0 pr-14">
                   <span className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{link.titulo}</span>
                   <span className="text-xs text-muted-foreground truncate">{link.url}</span>
                </div>
              </a>
              
              {canManage && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/90 p-1 rounded-lg border border-border shadow-xs">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); setEditingLink(link); setIsModalOpen(true); }}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.preventDefault(); handleDelete(link.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          {!loading && links.length === 0 && !canManage && (
            <p className="text-center py-4 text-xs font-medium text-muted-foreground">Nenhum link adicional.</p>
          )}
        </div>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLink?.id ? "Editar Link" : "Novo Link"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={editingLink?.titulo || ""} onChange={(e) => setEditingLink(prev => ({ ...prev, titulo: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">URL Externa</Label>
              <Input id="url" placeholder="https://..." value={editingLink?.url || ""} onChange={(e) => setEditingLink(prev => ({ ...prev, url: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="icone">Nome do Ícone (Lucide)</Label>
              <div className="flex gap-2">
                <Input id="icone" placeholder="Book, Globe, etc." value={editingLink?.icone || ""} onChange={(e) => setEditingLink(prev => ({ ...prev, icone: e.target.value }))} />
                <div className="h-10 w-10 rounded border flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                  <DynamicIcon name={editingLink?.icone || null} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
