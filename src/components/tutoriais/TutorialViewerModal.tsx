import { 
  ArrowLeft, 
  ExternalLink, 
  Video, 
  Calendar,
  Share2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tutorial, getYoutubeVideoId, getYoutubeEmbedUrl, formatarUrl } from "@/services/tutoriais"
import { RichTextRenderer } from "./RichTextRenderer"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface TutorialViewerModalProps {
  tutorial: Tutorial | null
  isOpen: boolean
  onClose: () => void
}

export function TutorialViewerModal({ tutorial, isOpen, onClose }: TutorialViewerModalProps) {
  if (!tutorial) return null

  const youtubeVideoId = getYoutubeVideoId(tutorial.link)
  const isYoutube = Boolean(youtubeVideoId)
  const hasLink = Boolean(tutorial.link && tutorial.link.trim())
  const finalLinkUrl = formatarUrl(tutorial.link)

  function handleCompartilhar() {
    if (navigator.clipboard && tutorial?.link) {
      navigator.clipboard.writeText(finalLinkUrl)
      toast.success("Link do tutorial copiado para a área de transferência!")
    } else {
      toast.info("Tutorial da instituição selecionado")
    }
  }

  function handleAbrirLinkExterno() {
    if (!hasLink) return
    window.open(finalLinkUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="w-[96vw] max-w-[96vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[92vh] max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden bg-background border-border/80 shadow-2xl"
      >
        {/* Cabeçalho do Modal */}
        <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                    {isYoutube ? "Vídeo Tutorial" : hasLink ? "Material Complementar" : "Guia de Instruções"}
                  </span>
                  {tutorial.created_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary/70" />
                      {format(new Date(tutorial.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-base sm:text-xl lg:text-2xl font-black text-foreground truncate mt-0.5">
                  {tutorial.titulo}
                </DialogTitle>
              </div>
            </div>

            {/* Ações Rápidas no Cabeçalho */}
            <div className="flex items-center gap-2 shrink-0">
              {hasLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCompartilhar}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-border"
                  title="Copiar link"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copiar Link</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Rolagem Independente */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-4">
          {/* Seção do Player de Vídeo (se for YouTube) */}
          {isYoutube && youtubeVideoId && (
            <div className="w-full rounded-2xl overflow-hidden border border-border/80 bg-black shadow-lg">
              <div className="relative w-full aspect-video">
                <iframe
                  src={getYoutubeEmbedUrl(youtubeVideoId, false)}
                  title={tutorial.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* Se for outro link que não é YouTube */}
          {!isYoutube && hasLink && (
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/25 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <ExternalLink className="h-6 w-6" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-sm sm:text-base text-foreground">
                    Link Externo Anexo ao Tutorial
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {finalLinkUrl}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleAbrirLinkExterno}
                className="bg-[#7f1d1d] hover:bg-[#661717] text-white font-bold text-xs sm:text-sm h-9 px-4 gap-2 rounded-xl shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Ir para o site do link</span>
              </Button>
            </div>
          )}

          {/* Texto Explicativo Formatado */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Instruções e Conteúdo</span>
            </h3>
            <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/70 shadow-2xs leading-relaxed">
              <RichTextRenderer content={tutorial.conteudo} />
            </div>
          </div>
        </div>

        {/* Rodapé do Modal com as 2 opções solicitadas pelo usuário:
            1. Voltar para a aplicação
            2. Ir para o site do link */}
        <DialogFooter className="pt-3 border-t border-border/60 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto font-bold text-xs sm:text-sm h-10 px-5 rounded-xl gap-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a aplicação</span>
          </Button>

          {hasLink && (
            <Button
              type="button"
              onClick={handleAbrirLinkExterno}
              className="w-full sm:w-auto font-bold text-xs sm:text-sm h-10 px-5 rounded-xl gap-2 bg-[#7f1d1d] hover:bg-[#661717] text-white shadow-xs"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{isYoutube ? "Assistir no YouTube" : "Ir para o site do link"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
