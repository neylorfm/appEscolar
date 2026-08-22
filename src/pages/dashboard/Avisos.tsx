import { useState, useEffect } from "react"
import { Bell, Plus, Trash2, Edit2, Clock, Calendar, Image as ImageIcon, ExternalLink, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { getAvisos, Aviso, deleteAviso, upsertAviso } from "@/services/dashboard"
import { CardBimestres } from "./CardBimestres"
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
        imagem_url: editingAviso.imagem_url ? editingAviso.imagem_url.trim() : null,
        data_publicacao: editingAviso.data_publicacao || new Date().toISOString()
      })
      toast.success(editingAviso.id ? "Aviso atualizado com sucesso" : "Aviso publicado com sucesso")
      setIsModalOpen(false)
      loadAvisos()
    } catch (error: any) {
      console.error("Erro ao salvar aviso:", error)
      toast.error("Erro ao salvar aviso", {
        description: error?.message || "Verifique se a tabela avisos existe no banco de dados."
      })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja apagar este aviso?")) return
    try {
      await deleteAviso(id)
      toast.success("Aviso removido")
      loadAvisos()
    } catch (error: any) {
      console.error("Erro ao excluir aviso:", error)
      toast.error("Erro ao excluir", {
        description: error?.message || "Erro ao conectar com o banco de dados."
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
           <Bell className="h-5 w-5 text-primary" />
           <h2 className="text-xl font-bold">Quadro de Avisos</h2>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => { setEditingAviso({}); setIsModalOpen(true); }} className="rounded-full px-4 border shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Novo Aviso
          </Button>
        )}
      </div>

      {/* Card Otimizado por Bimestre */}
      <CardBimestres />

      <div className="grid gap-4">
        {avisos.map((aviso) => (
          <Card key={aviso.id} className="relative group overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900/50 dark:border dark:border-slate-800">
            {canManage && (
              <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 border shadow-xs" onClick={() => { setEditingAviso(aviso); setIsModalOpen(true); }} title="Editar aviso">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 border shadow-xs text-red-500 hover:text-red-600" onClick={() => handleDelete(aviso.id)} title="Excluir aviso">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(aviso.data_publicacao), "dd 'de' MMMM", { locale: ptBR })}
                <span className="mx-1">•</span>
                <Clock className="h-3 w-3" />
                {format(new Date(aviso.data_publicacao), "HH:mm")}
              </div>
              <CardTitle className="text-lg text-slate-800 dark:text-slate-100 pr-16">{aviso.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Imagem do Aviso (se informada) */}
              {aviso.imagem_url && (
                <div className="relative group/img overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex justify-center items-center max-h-60 sm:max-h-72">
                  <img
                    src={aviso.imagem_url}
                    alt={aviso.titulo}
                    className="w-full h-auto max-h-60 sm:max-h-72 object-contain rounded-lg transition-transform duration-300 hover:scale-[1.01]"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden')
                    }}
                  />
                  <a
                    href={aviso.imagem_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-xs shadow-sm"
                    title="Ver imagem em tamanho real"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {aviso.conteudo}
              </p>
            </CardContent>
          </Card>
        ))}

        {!loading && avisos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed">
            <Bell className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 dark:text-[#b8e8b3] font-medium">Nenhum aviso importante no momento.</p>
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
              <Label htmlFor="aviso-titulo">Título *</Label>
              <Input 
                id="aviso-titulo" 
                placeholder="Ex: Reunião Pedagógica, Feira de Ciências..."
                value={editingAviso?.titulo || ""} 
                onChange={(e) => setEditingAviso(prev => ({ ...prev, titulo: e.target.value }))} 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="aviso-imagem">Link da Imagem (URL Opcional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    id="aviso-imagem" 
                    placeholder="https://exemplo.com/imagem.jpg" 
                    value={editingAviso?.imagem_url || ""} 
                    onChange={(e) => setEditingAviso(prev => ({ ...prev, imagem_url: e.target.value }))} 
                    className="pr-8"
                  />
                  {editingAviso?.imagem_url && (
                    <button
                      type="button"
                      onClick={() => setEditingAviso(prev => ({ ...prev, imagem_url: "" }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Limpar imagem"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cole o link direto da imagem na internet. Apenas a URL será armazenada.
              </p>

              {/* Prévia da Imagem no Modal */}
              {editingAviso?.imagem_url && (
                <div className="mt-1 p-2 rounded-lg border bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center justify-center gap-1">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                    <ImageIcon className="h-3.5 w-3.5" /> Prévia da imagem
                  </div>
                  <img
                    src={editingAviso.imagem_url}
                    alt="Prévia"
                    className="max-h-40 w-auto rounded object-contain border bg-white dark:bg-slate-950"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="aviso-conteudo">Conteúdo *</Label>
              <Textarea 
                id="aviso-conteudo" 
                rows={5} 
                placeholder="Descreva o comunicado ou aviso aos professores e funcionários..."
                value={editingAviso?.conteudo || ""} 
                onChange={(e) => setEditingAviso(prev => ({ ...prev, conteudo: e.target.value }))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingAviso?.id ? "Salvar Alterações" : "Publicar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

