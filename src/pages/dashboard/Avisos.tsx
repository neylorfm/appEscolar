import { useState, useEffect } from "react"
import { Bell, Plus, Trash2, Edit2, Clock, Calendar } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { getAvisos, Aviso, deleteAviso, upsertAviso } from "@/services/dashboard"
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
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function Avisos() {
  const { usuario } = useAuth()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAviso, setEditingAviso] = useState<Partial<Aviso> | null>(null)
  
  const canManage = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'

  useEffect(() => {
    loadAvisos()
  }, [])

  async function loadAvisos() {
    try {
      const data = await getAvisos()
      setAvisos(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!editingAviso?.titulo || !editingAviso?.conteudo) {
      toast.error("Preencha o título e o conteúdo")
      return
    }

    try {
      await upsertAviso({
        ...editingAviso,
        autor_id: usuario?.id,
        data_publicacao: editingAviso.data_publicacao || new Date().toISOString()
      })
      toast.success("Aviso publicado")
      setIsModalOpen(false)
      loadAvisos()
    } catch (error) {
      toast.error("Erro ao salvar aviso")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja apagar este aviso?")) return
    try {
      await deleteAviso(id)
      toast.success("Aviso removido")
      loadAvisos()
    } catch (error) {
      toast.error("Erro ao excluir")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-slate-800">
           <Bell className="h-5 w-5 text-primary" />
           <h2 className="text-xl font-bold">Quadro de Avisos</h2>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => { setEditingAviso({}); setIsModalOpen(true); }} className="rounded-full px-4 border shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Novo Aviso
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {avisos.map((aviso) => (
          <Card key={aviso.id} className="relative group overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white">
            {canManage && (
              <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 border" onClick={() => { setEditingAviso(aviso); setIsModalOpen(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 border text-red-500 hover:text-red-600" onClick={() => handleDelete(aviso.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(aviso.data_publicacao), "dd 'de' MMMM", { locale: ptBR })}
                <span className="mx-1">•</span>
                <Clock className="h-3 w-3" />
                {format(new Date(aviso.data_publicacao), "HH:mm")}
              </div>
              <CardTitle className="text-lg text-slate-800">{aviso.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {aviso.conteudo}
              </p>
            </CardContent>
          </Card>
        ))}

        {!loading && avisos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed">
            <Bell className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 font-medium">Nenhum aviso importante no momento.</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAviso?.id ? "Editar Aviso" : "Publicar Novo Aviso"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="aviso-titulo">Título</Label>
              <Input id="aviso-titulo" value={editingAviso?.titulo || ""} onChange={(e) => setEditingAviso(prev => ({ ...prev, titulo: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="aviso-conteudo">Conteúdo</Label>
              <Textarea id="aviso-conteudo" rows={5} value={editingAviso?.conteudo || ""} onChange={(e) => setEditingAviso(prev => ({ ...prev, conteudo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
