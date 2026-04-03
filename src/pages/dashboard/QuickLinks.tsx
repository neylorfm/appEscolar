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
    } catch (error) {
      toast.error("Erro ao salvar link")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este link?")) return
    try {
      await deleteQuickLink(id)
      toast.success("Link excluído")
      loadLinks()
    } catch (error) {
      toast.error("Erro ao excluir link")
    }
  }


  const DynamicIcon = ({ name, className }: { name: string | null, className?: string }) => {
    if (!name) return <ExternalLink className={className} />
    const Icon = (LucideIcons as any)[name]
    return Icon ? <Icon className={className} /> : <ExternalLink className={className} />
  }

  return (
    <Card className="shadow-sm border-none bg-slate-50/50 dark:bg-slate-900/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white">Links Rápidos</CardTitle>
        {canManage && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => { setEditingLink({ icone: 'ExternalLink' }); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {/* Default System Links */}
          <Link to="/calendario" className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-md transition-all group">
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200">Calendário Letivo</span>
          </Link>

          <Link to="/agendamentos" className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-md transition-all group">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200">Agendamentos</span>
          </Link>

          {/* Custom Links */}
          {links.map((link) => (
            <div key={link.id} className="relative group">
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <DynamicIcon name={link.icone} className="h-5 w-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                   <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{link.titulo}</span>
                   <span className="text-[10px] text-muted-foreground truncate">{link.url}</span>
                </div>
              </a>
              
              {canManage && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={(e) => { e.preventDefault(); setEditingLink(link); setIsModalOpen(true); }}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={(e) => { e.preventDefault(); handleDelete(link.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          {!loading && links.length === 0 && !canManage && (
            <p className="text-center py-4 text-xs text-muted-foreground">Nenhum link adicional.</p>
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
