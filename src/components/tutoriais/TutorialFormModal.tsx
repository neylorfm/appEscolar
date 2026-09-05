import { useState, useEffect } from "react"
import { 
  Video, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  X,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  Tutorial, 
  upsertTutorial, 
  getYoutubeVideoId, 
  getYoutubeThumbnail 
} from "@/services/tutoriais"
import { useAuth } from "@/contexts/AuthContext"
import { RichTextEditor } from "./RichTextEditor"
import { toast } from "sonner"

interface TutorialFormModalProps {
  isOpen: boolean
  onClose: () => void
  tutorialToEdit?: Partial<Tutorial> | null
  onSuccess: () => void
}

export function TutorialFormModal({
  isOpen,
  onClose,
  tutorialToEdit,
  onSuccess
}: TutorialFormModalProps) {
  const { usuario } = useAuth()
  const [titulo, setTitulo] = useState("")
  const [link, setLink] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (tutorialToEdit) {
      setTitulo(tutorialToEdit.titulo || "")
      setLink(tutorialToEdit.link || "")
      setConteudo(tutorialToEdit.conteudo || "")
    } else {
      setTitulo("")
      setLink("")
      setConteudo("")
    }
  }, [tutorialToEdit, isOpen])

  const youtubeVideoId = getYoutubeVideoId(link)
  const isYoutube = Boolean(youtubeVideoId)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()

    if (!titulo.trim()) {
      toast.error("Informe o título do tutorial")
      return
    }

    if (!conteudo.trim()) {
      toast.error("Informe o texto com as instruções do tutorial")
      return
    }

    setSalvando(true)
    try {
      await upsertTutorial({
        id: tutorialToEdit?.id,
        titulo: titulo.trim(),
        link: link.trim() || null,
        conteudo: conteudo.trim(),
        autor_id: usuario?.id,
        ordem: tutorialToEdit?.ordem ?? 0
      })

      toast.success(
        tutorialToEdit?.id 
          ? "Tutorial atualizado com sucesso!" 
          : "Novo tutorial publicado com sucesso!"
      )
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar tutorial:", error)
      toast.error("Erro ao salvar tutorial", {
        description: error?.message || "Verifique as configurações do banco de dados."
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Video className="h-4 w-4" />
            </div>
            <span>{tutorialToEdit?.id ? "Editar Tutorial" : "Novo Tutorial"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto pr-1 space-y-4 py-3">
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="tutorial-titulo" className="text-xs font-bold uppercase tracking-wider text-foreground">
              Título do Tutorial *
            </Label>
            <Input
              id="tutorial-titulo"
              placeholder="Ex: Como realizar o lançamento de avaliações e notas..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="h-10 text-sm font-medium"
            />
          </div>

          {/* Link Opcional (com foco em YouTube) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tutorial-link" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Link do Vídeo ou Material Complementar (Opcional)</span>
              </Label>
              <span className="text-[11px] text-muted-foreground font-semibold">Preferência YouTube</span>
            </div>

            <div className="relative">
              <Input
                id="tutorial-link"
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="h-10 text-sm font-mono pr-8"
              />
              {link && (
                <button
                  type="button"
                  onClick={() => setLink("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  title="Limpar link"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Pré-visualização instantânea se for YouTube */}
            {isYoutube && youtubeVideoId && (
              <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border/80 flex items-center gap-3 animate-in fade-in duration-200">
                <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-border/60">
                  <img
                    src={getYoutubeThumbnail(youtubeVideoId)}
                    alt="Miniatura do YouTube"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
                      <Play className="h-3 w-3 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Vídeo do YouTube detectado
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    A miniatura será gerada automaticamente sem consumir espaço no banco de dados.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Texto com Elementos de Edição / Formatação */}
          <div className="space-y-1.5">
            <Label htmlFor="tutorial-conteudo" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Instruções e Texto Explicativo (com Formatação) *</span>
            </Label>
            
            <RichTextEditor
              id="tutorial-conteudo"
              value={conteudo}
              onChange={setConteudo}
              placeholder="Descreva detalhadamente o passo a passo. Use a barra de ferramentas para aplicar negrito, títulos, listas ou destaques..."
              rows={8}
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-[#7f1d1d] hover:bg-[#661717] text-white font-bold"
            >
              {salvando ? "Salvando..." : tutorialToEdit?.id ? "Salvar Alterações" : "Publicar Tutorial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
