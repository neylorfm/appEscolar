import { useState, useEffect, useMemo } from "react"
import { 
  GraduationCap, 
  Plus, 
  Maximize2, 
  Minimize2, 
  Search, 
  ArrowUpDown, 
  Play, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  BookOpen, 
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { 
  Tutorial, 
  getTutoriais, 
  deleteTutorial, 
  getYoutubeVideoId, 
  getYoutubeThumbnail
} from "@/services/tutoriais"
import { TutorialViewerModal } from "./TutorialViewerModal"
import { TutorialFormModal } from "./TutorialFormModal"
import { TutorialReordenarModal } from "./TutorialReordenarModal"
import { RichTextRenderer } from "./RichTextRenderer"
import { toast } from "sonner"

interface TutoriaisSectionProps {
  className?: string
  isStandalonePage?: boolean
}

export function TutoriaisSection({ className = "", isStandalonePage }: TutoriaisSectionProps) {
  const { usuario } = useAuth()
  const [tutoriais, setTutoriais] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [isTelaCheia, setIsTelaCheia] = useState(false)

  // Modais
  const [tutorialVisualizando, setTutorialVisualizando] = useState<Tutorial | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [tutorialToEdit, setTutorialToEdit] = useState<Tutorial | null>(null)
  const [isReordenarModalOpen, setIsReordenarModalOpen] = useState(false)

  // Controle de Permissões:
  // - Professores: apenas visualização
  // - Coordenadores e Administradores: criar, editar, excluir, reordenar
  const canManage = usuario?.papel === "Administrador" || usuario?.papel === "Coordenador"

  useEffect(() => {
    carregarTutoriais()
  }, [])

  // Suporte à tecla ESC para sair do modo tela cheia
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isTelaCheia) {
        setIsTelaCheia(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isTelaCheia])

  async function carregarTutoriais() {
    try {
      const data = await getTutoriais()
      setTutoriais(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExcluir(tutorial: Tutorial) {
    if (!confirm(`Tem certeza que deseja excluir o tutorial "${tutorial.titulo}"?`)) {
      return
    }

    try {
      await deleteTutorial(tutorial.id)
      toast.success("Tutorial removido com sucesso!")
      if (tutorialVisualizando?.id === tutorial.id) {
        setTutorialVisualizando(null)
      }
      carregarTutoriais()
    } catch (error: any) {
      console.error("Erro ao excluir tutorial:", error)
      toast.error("Erro ao excluir tutorial", {
        description: error?.message || "Tente novamente mais tarde."
      })
    }
  }

  const tutoriaisFiltrados = useMemo(() => {
    if (!busca.trim()) return tutoriais
    const termo = busca.toLowerCase().trim()
    return tutoriais.filter(
      (t) =>
        t.titulo.toLowerCase().includes(termo) ||
        t.conteudo.toLowerCase().includes(termo)
    )
  }, [tutoriais, busca])

  return (
    <div
      className={`${
        isTelaCheia
          ? "fixed inset-0 z-[100] w-screen h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto animate-in fade-in duration-200"
          : `flex flex-col gap-4 ${className}`
      }`}
    >
      {/* ========================================================================= */}
      {/* CABEÇALHO DA SEÇÃO DE TUTORIAIS                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        {/* Lado Esquerdo: Ícone + Título + Contador */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#7f1d1d]/10 text-[#7f1d1d] dark:bg-[#f8b4bc]/20 dark:text-[#f8b4bc] flex items-center justify-center shrink-0 border border-[#7f1d1d]/20">
            <GraduationCap className="h-5 w-5" />
          </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#7f1d1d] dark:text-[#f8b4bc]">
                  Tutoriais
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/80">
                  {tutoriais.length} {tutoriais.length === 1 ? "vídeo/guia" : "vídeos/guias"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {isStandalonePage
                  ? "Central institucional de capacitações e tutoriais passo a passo."
                  : "Capacitações, orientações operacionais e tutoriais passo a passo."}
              </p>
            </div>
        </div>

        {/* Lado Direito: Ações (Tela Cheia, Busca, Reordenar, Novo) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Busca Rápida */}
          <div className="relative w-full sm:w-56 lg:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tutoriais..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-8 text-xs font-medium rounded-lg"
            />
          </div>

          {/* Botão de Expandir / Reduzir Tela Cheia (Requisito Explícito) */}
          <Button
            type="button"
            variant={isTelaCheia ? "default" : "outline"}
            size="sm"
            onClick={() => setIsTelaCheia(!isTelaCheia)}
            className={`h-8 px-2.5 text-xs font-bold gap-1.5 rounded-lg shrink-0 transition-all ${
              isTelaCheia
                ? "bg-[#7f1d1d] hover:bg-[#661717] text-white shadow-xs"
                : "border-border hover:bg-muted"
            }`}
            title={isTelaCheia ? "Sair da Tela Cheia (ESC)" : "Expandir Seção em Tela Cheia"}
          >
            {isTelaCheia ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-white" />
                <span className="hidden md:inline">Sair da Tela Cheia</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                <span>Tela Cheia</span>
              </>
            )}
          </Button>

          {/* Reordenar (Apenas Coordenadores e Administradores) */}
          {canManage && tutoriais.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReordenarModalOpen(true)}
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg border-border hover:bg-muted shrink-0"
              title="Reordenar a ordem dos tutoriais"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Reordenar</span>
            </Button>
          )}

          {/* Novo Tutorial (Apenas Coordenadores e Administradores) */}
          {canManage && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setTutorialToEdit(null)
                setIsFormModalOpen(true)
              }}
              className="h-8 px-3 text-xs font-bold gap-1.5 rounded-lg bg-[#7f1d1d] hover:bg-[#661717] text-white shrink-0 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRADE DE CARDS DOS TUTORIAIS                                              */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Carregando tutoriais...</span>
        </div>
      ) : tutoriaisFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/80 my-2">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-bold text-foreground">
            {busca ? "Nenhum tutorial encontrado para a busca." : "Nenhum tutorial cadastrado ainda."}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {busca
              ? "Tente buscar por outras palavras-chave ou limpe o campo de busca."
              : canManage
              ? "Clique no botão 'Novo' acima para adicionar o primeiro vídeo ou guia para os professores."
              : "Novos vídeos instrutivos e tutoriais da coordenação aparecerão aqui."}
          </p>
          {busca && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBusca("")}
              className="mt-3 text-xs h-7"
            >
              Limpar busca
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 transition-all duration-300">
          {tutoriaisFiltrados.map((tutorial) => {
            const youtubeVideoId = getYoutubeVideoId(tutorial.link)
            const isYoutube = Boolean(youtubeVideoId)
            const hasLink = Boolean(tutorial.link && tutorial.link.trim())

            return (
              <div
                key={tutorial.id}
                onClick={() => setTutorialVisualizando(tutorial)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setTutorialVisualizando(tutorial)
                  }
                }}
                className="group text-left rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden select-none"
              >
                {/* 1. Mídia / Thumbnail no Topo do Card */}
                <div className="relative w-full aspect-video bg-slate-900 flex items-center justify-center overflow-hidden border-b border-border/60">
                  {isYoutube && youtubeVideoId ? (
                    <>
                      <img
                        src={getYoutubeThumbnail(youtubeVideoId)}
                        alt={tutorial.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Botão Play em Overlay */}
                      <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-red-600 transition-all">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/80 text-white backdrop-blur-xs">
                        YouTube
                      </span>
                    </>
                  ) : hasLink ? (
                    <div className="w-full h-full bg-linear-to-br from-primary/10 via-muted/30 to-background flex flex-col items-center justify-center p-4 text-center">
                      <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <ExternalLink className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Link Complementar
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-muted/20 via-muted/40 to-background flex flex-col items-center justify-center p-4 text-center">
                      <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Instruções em Texto
                      </span>
                    </div>
                  )}

                  {/* Ações de Gestão (Apenas Coordenador e Administrador no Hover) */}
                  {canManage && (
                    <div
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/95 backdrop-blur-xs p-1 rounded-lg border border-border shadow-xs z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTutorialToEdit(tutorial)
                          setIsFormModalOpen(true)
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                        title="Editar tutorial"
                        aria-label={`Editar tutorial ${tutorial.titulo}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExcluir(tutorial)
                        }}
                        className="h-6 w-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-md"
                        title="Excluir tutorial"
                        aria-label={`Excluir tutorial ${tutorial.titulo}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. Conteúdo Textual do Card */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {tutorial.titulo}
                    </h3>
                    <RichTextRenderer
                      content={tutorial.conteudo}
                      clampLines={3}
                      className="text-xs text-muted-foreground"
                    />
                  </div>

                  {/* 3. Rodapé do Card */}
                  <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      {isYoutube ? (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>Assistir vídeo</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3 w-3" />
                          <span>Ver tutorial</span>
                        </>
                      )}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>

                    {hasLink && (
                      <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">
                        Possui link
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS: VISUALIZAÇÃO, CRIAÇÃO/EDIÇÃO E REORDENAÇÃO                        */}
      {/* ========================================================================= */}
      <TutorialViewerModal
        tutorial={tutorialVisualizando}
        isOpen={Boolean(tutorialVisualizando)}
        onClose={() => setTutorialVisualizando(null)}
      />

      {canManage && (
        <>
          <TutorialFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false)
              setTutorialToEdit(null)
            }}
            tutorialToEdit={tutorialToEdit}
            onSuccess={carregarTutoriais}
          />

          <TutorialReordenarModal
            isOpen={isReordenarModalOpen}
            onClose={() => setIsReordenarModalOpen(false)}
            tutoriais={tutoriais}
            onSuccess={carregarTutoriais}
          />
        </>
      )}
    </div>
  )
}
