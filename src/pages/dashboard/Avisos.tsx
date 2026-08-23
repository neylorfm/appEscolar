import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  ExternalLink, 
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Search,
  Filter
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const CATEGORIAS_PADRAO = [
  { rotulo: "REUNIÃO PEDAGÓGICA", valor: "REUNIÃO PEDAGÓGICA", cor: "bg-[#d8f0f8] text-[#136380] dark:bg-[#136380]/30 dark:text-[#90ddf0] border-transparent" },
  { rotulo: "PRAZO", valor: "PRAZO", cor: "bg-[#fce4d6] text-[#8a431d] dark:bg-[#8a431d]/30 dark:text-[#f5be9e] border-transparent" },
  { rotulo: "COMUNICADO", valor: "COMUNICADO", cor: "bg-[#ede4f8] text-[#593285] dark:bg-[#593285]/30 dark:text-[#d3b6f5] border-transparent" },
  { rotulo: "AVISO GERAL", valor: "AVISO GERAL", cor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-transparent" },
  { rotulo: "IMPORTANTE", valor: "IMPORTANTE", cor: "bg-[#fadcd9] text-[#8e2825] dark:bg-[#8e2825]/30 dark:text-[#f7a8a6] border-transparent" },
  { rotulo: "EVENTO", valor: "EVENTO", cor: "bg-[#def2e6] text-[#1e6b45] dark:bg-[#1e6b45]/30 dark:text-[#9fe3be] border-transparent" },
]

function getCategoriaBadge(categoria?: string | null) {
  const cat = categoria?.toUpperCase().trim() || "COMUNICADO"
  const encontrada = CATEGORIAS_PADRAO.find(c => c.valor === cat)
  if (encontrada) return encontrada
  return {
    rotulo: categoria?.toUpperCase() || "COMUNICADO",
    valor: cat,
    cor: "bg-[#ede4f8] text-[#593285] dark:bg-[#593285]/30 dark:text-[#d3b6f5] border-transparent"
  }
}

export function Avisos() {
  const { usuario } = useAuth()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isVerTodosOpen, setIsVerTodosOpen] = useState(false)
  const [buscaVerTodos, setBuscaVerTodos] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODAS")
  const [editingAviso, setEditingAviso] = useState<Partial<Aviso> | null>(null)
  const [visualizandoAviso, setVisualizandoAviso] = useState<Aviso | null>(null)
  
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  const canManage = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'

  useEffect(() => {
    loadAvisos()
  }, [])

  const updateScrollButtons = () => {
    if (!carouselRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    
    const page = Math.round(scrollLeft / (clientWidth || 1))
    setActiveSlide(page)
  }

  useEffect(() => {
    updateScrollButtons()
    window.addEventListener("resize", updateScrollButtons)
    return () => window.removeEventListener("resize", updateScrollButtons)
  }, [avisos])

  function scrollPrev() {
    if (!carouselRef.current) return
    const container = carouselRef.current
    container.scrollBy({ left: -container.clientWidth, behavior: "smooth" })
  }

  function scrollNext() {
    if (!carouselRef.current) return
    const container = carouselRef.current
    container.scrollBy({ left: container.clientWidth, behavior: "smooth" })
  }

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

  function formatarUrl(url?: string | null) {
    if (!url) return ""
    const trimmed = url.trim()
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  function handleCardClick(aviso: Aviso) {
    // Sempre abre a leitura completa do aviso para permitir leitura do texto integral
    setVisualizandoAviso(aviso)
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
        link: editingAviso.link ? formatarUrl(editingAviso.link) : null,
        categoria: editingAviso.categoria || "COMUNICADO",
        imagem_url: editingAviso.imagem_url ? editingAviso.imagem_url.trim() : null,
        data_publicacao: editingAviso.data_publicacao || new Date().toISOString()
      })
      toast.success(editingAviso.id ? "Aviso atualizado com sucesso" : "Aviso publicado com sucesso")
      setIsModalOpen(false)
      loadAvisos()
    } catch (error: any) {
      console.error("Erro ao salvar aviso:", error)
      toast.error("Erro ao salvar aviso", {
        description: error?.message || "Verifique as configurações do banco de dados."
      })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja apagar este aviso?")) return
    try {
      await deleteAviso(id)
      toast.success("Aviso removido")
      if (visualizandoAviso?.id === id) {
        setVisualizandoAviso(null)
      }
      loadAvisos()
    } catch (error: any) {
      console.error("Erro ao excluir aviso:", error)
      toast.error("Erro ao excluir", {
        description: error?.message || "Erro ao conectar com o banco de dados."
      })
    }
  }

  const avisosFiltradosModal = useMemo(() => {
    return avisos.filter(aviso => {
      const matchBusca = !buscaVerTodos.trim() || 
        aviso.titulo.toLowerCase().includes(buscaVerTodos.toLowerCase()) ||
        aviso.conteudo.toLowerCase().includes(buscaVerTodos.toLowerCase())
      
      const matchCategoria = categoriaFiltro === "TODAS" || 
        (aviso.categoria || "COMUNICADO").toUpperCase().trim() === categoriaFiltro
      
      return matchBusca && matchCategoria
    })
  }, [avisos, buscaVerTodos, categoriaFiltro])

  return (
    <div className="flex flex-col gap-8">
      {/* SEÇÃO 1: QUADRO DE AVISOS (Carrossel Compacto de 2 Cards) */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2.5">
            <Megaphone className="h-5 w-5 lg:h-6 lg:w-6 text-[#7f1d1d] dark:text-[#f8b4bc]" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#7f1d1d] dark:text-[#f8b4bc]">
              Quadro de Avisos
            </h2>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Controles de Navegação Lateral (Aparece quando houver avisos para rolar) */}
            {avisos.length > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollPrev}
                  disabled={!canScrollLeft}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border-border/80 text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  title="Avisos anteriores"
                  aria-label="Ver avisos anteriores"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollNext}
                  disabled={!canScrollRight}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border-border/80 text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  title="Próximos avisos"
                  aria-label="Ver próximos avisos"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {avisos.length > 0 && (
              <button
                type="button"
                onClick={() => setIsVerTodosOpen(true)}
                className="text-xs lg:text-sm font-bold uppercase tracking-wider text-[#ad6020] dark:text-[#f0aa70] hover:underline cursor-pointer transition-colors whitespace-nowrap"
              >
                VER TODOS ({avisos.length})
              </button>
            )}

            {canManage && (
              <Button 
                size="sm" 
                onClick={() => { setEditingAviso({ categoria: "COMUNICADO" }); setIsModalOpen(true); }} 
                className="rounded-lg px-3 text-xs lg:text-sm font-semibold shadow-xs gap-1.5 h-8 lg:h-9 bg-[#7f1d1d] hover:bg-[#661717] text-white shrink-0"
              >
                <Plus className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> 
                <span>Novo</span>
              </Button>
            )}
          </div>
        </div>

        {/* Carrossel de Cards de Avisos: 2 no Desktop, 1 no Mobile com Rolagem Horizontal Suave */}
        {loading ? (
          <div className="py-8 text-center text-xs lg:text-sm text-muted-foreground">
            Carregando quadro de avisos...
          </div>
        ) : avisos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/80">
            <Megaphone className="h-8 w-8 lg:h-10 lg:w-10 text-muted-foreground/60 mb-2" />
            <p className="text-sm lg:text-base text-foreground/80 font-semibold">Nenhum aviso no momento.</p>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">Novos comunicados institucionais aparecerão aqui.</p>
          </div>
        ) : (
          <div className="relative">
            <div 
              ref={carouselRef}
              onScroll={updateScrollButtons}
              className="flex gap-3.5 lg:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 pt-0.5 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {avisos.map((aviso) => {
                const badge = getCategoriaBadge(aviso.categoria)
                const hasLink = Boolean(aviso.link && aviso.link.trim())

                return (
                  <div
                    key={aviso.id}
                    onClick={() => handleCardClick(aviso)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleCardClick(aviso)
                      }
                    }}
                    className="w-full sm:w-[calc(50%-0.5rem)] min-w-full sm:min-w-[calc(50%-0.5rem)] shrink-0 snap-start group relative text-left rounded-xl border border-border/80 bg-card p-4 sm:p-4.5 lg:p-5 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 lg:gap-3.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary select-none min-h-[175px]"
                  >
                    {/* Linha de Categoria e Ações */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] sm:text-[11px] lg:text-xs font-bold tracking-wider uppercase px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md border shrink-0 whitespace-nowrap ${badge.cor}`}>
                        {badge.rotulo}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botão de Acesso ao Link no Card (Acessível, sem quebra de linha) */}
                        {hasLink && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(formatarUrl(aviso.link), "_blank", "noopener,noreferrer")
                            }}
                            className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-colors px-2.5 py-0.5 lg:py-1 rounded-md border border-primary/20 shadow-2xs z-10 whitespace-nowrap shrink-0"
                            title="Acessar Link Externo"
                            aria-label={`Acessar link anexo do aviso: ${aviso.titulo}`}
                          >
                            <ExternalLink className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                            <span>Acessar Link</span>
                          </button>
                        )}

                        {/* Botões de Ação para Administrador / Coordenador */}
                        {canManage && (
                          <div 
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 p-0.5 rounded-lg border border-border shadow-2xs z-10 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 lg:h-7 lg:w-7 text-muted-foreground hover:text-foreground" 
                              onClick={(e) => { e.stopPropagation(); setEditingAviso(aviso); setIsModalOpen(true); }} 
                              title="Editar aviso"
                              aria-label={`Editar aviso: ${aviso.titulo}`}
                            >
                              <Edit2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 lg:h-7 lg:w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10" 
                              onClick={(e) => { e.stopPropagation(); handleDelete(aviso.id); }} 
                              title="Excluir aviso"
                              aria-label={`Excluir aviso: ${aviso.titulo}`}
                            >
                              <Trash2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Título do Aviso */}
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {aviso.titulo}
                      </h3>
                    </div>

                    {/* Resumo do Conteúdo (Texto enxuto) */}
                    <p className="text-xs sm:text-[13px] lg:text-[14px] text-muted-foreground leading-relaxed line-clamp-2">
                      {aviso.conteudo}
                    </p>

                    {/* Data / Hora e Ação "Ler aviso" no rodapé do Card */}
                    <div className="pt-2 flex items-center justify-between text-[11px] lg:text-xs text-muted-foreground/80 font-medium border-t border-border/40">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary/70" />
                        {format(new Date(aviso.data_publicacao), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="text-[11px] lg:text-xs text-primary font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Ler aviso</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Indicadores de Posição / Bolinhas no Mobile e Desktop (Quando > 1 card no mobile ou > 2 cards no desktop) */}
            {avisos.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {Array.from({ length: Math.ceil(avisos.length / 2) }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!carouselRef.current) return
                      const container = carouselRef.current
                      container.scrollTo({ left: idx * container.clientWidth, behavior: "smooth" })
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      activeSlide === idx 
                        ? "w-5 bg-[#7f1d1d] dark:bg-[#f8b4bc]" 
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Ir para página ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: INFORMAÇÕES POR BIMESTRE */}
      <CardBimestres />

      {/* MODAL 1: VISUALIZAR AVISO COMPLETO (TEXTO PURO / EXPANDIDO / ACESSÍVEL) */}
      <Dialog open={!!visualizandoAviso} onOpenChange={(open) => !open && setVisualizandoAviso(null)}>
        <DialogContent className="sm:max-w-lg">
          {visualizandoAviso && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border ${getCategoriaBadge(visualizandoAviso.categoria).cor}`}>
                    {getCategoriaBadge(visualizandoAviso.categoria).rotulo}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 text-primary" />
                    {format(new Date(visualizandoAviso.data_publicacao), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>

                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-snug text-left">
                  {visualizandoAviso.titulo}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
                {/* Imagem do Aviso se existir */}
                {visualizandoAviso.imagem_url && (
                  <div className="rounded-xl border border-border bg-muted/20 overflow-hidden flex justify-center items-center">
                    <img 
                      src={visualizandoAviso.imagem_url} 
                      alt={visualizandoAviso.titulo} 
                      className="max-h-72 w-full object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Conteúdo Completo com formatação e quebra de linha */}
                <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/15 p-3.5 border border-border/60">
                  {visualizandoAviso.conteudo}
                </div>

                {/* Link Anexo (Acessível, sem mostrar URL bruta) */}
                {visualizandoAviso.link && (
                  <div className="pt-1">
                    <a
                      href={formatarUrl(visualizandoAviso.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 transition-all text-primary group"
                      aria-label="Abrir link complementar em nova aba"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">Link / Material Complementar</p>
                          <p className="text-xs text-muted-foreground">Clique para abrir o link externo anexo</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Acessar
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </a>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 flex flex-row items-center justify-between sm:justify-between w-full">
                <Button variant="outline" onClick={() => setVisualizandoAviso(null)}>
                  Fechar
                </Button>
                {visualizandoAviso.link && (
                  <Button 
                    onClick={() => window.open(formatarUrl(visualizandoAviso.link), '_blank', 'noopener,noreferrer')}
                    className="gap-1.5 font-semibold"
                  >
                    <ExternalLink className="h-4 w-4" /> Acessar Link
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: VER TODOS OS AVISOS */}
      <Dialog open={isVerTodosOpen} onOpenChange={setIsVerTodosOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Todos os Avisos Institucionais
            </DialogTitle>
          </DialogHeader>

          {/* Filtros de Busca e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar avisos por título ou texto..."
                value={buscaVerTodos}
                onChange={(e) => setBuscaVerTodos(e.target.value)}
                className="pl-8.5 h-9 text-xs sm:text-sm"
              />
            </div>
            <div className="relative">
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por Categoria" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Categorias</SelectItem>
                  {CATEGORIAS_PADRAO.map(cat => (
                    <SelectItem key={cat.valor} value={cat.valor}>
                      {cat.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista Rolável de Avisos */}
          <div className="overflow-y-auto pr-1 flex-1 space-y-3 min-h-[250px]">
            {avisosFiltradosModal.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhum aviso encontrado com os filtros selecionados.
              </div>
            ) : (
              avisosFiltradosModal.map((aviso) => {
                const badge = getCategoriaBadge(aviso.categoria)
                const hasLink = Boolean(aviso.link && aviso.link.trim())

                return (
                  <div
                    key={aviso.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border ${badge.cor}`}>
                        {badge.rotulo}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary/70" />
                        {format(new Date(aviso.data_publicacao), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                      {aviso.titulo}
                    </h4>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {aviso.conteudo}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsVerTodosOpen(false)
                          setVisualizandoAviso(aviso)
                        }}
                        className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary gap-1"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Ler aviso completo
                      </Button>

                      {hasLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(formatarUrl(aviso.link), "_blank", "noopener,noreferrer")}
                          className="h-7 px-2.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Acessar Link
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsVerTodosOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CRIAR / EDITAR AVISO (ADMIN) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {editingAviso?.id ? "Editar Aviso" : "Publicar Novo Aviso"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="grid gap-3.5 py-2">
            {/* Categoria */}
            <div className="grid gap-1.5">
              <Label htmlFor="aviso-cat" className="text-xs font-semibold">Categoria / Tag</Label>
              <Select 
                value={editingAviso?.categoria || "COMUNICADO"} 
                onValueChange={(val) => setEditingAviso(prev => ({ ...prev, categoria: val }))}
              >
                <SelectTrigger id="aviso-cat" className="h-9 text-sm">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PADRAO.map((cat) => (
                    <SelectItem key={cat.valor} value={cat.valor}>
                      {cat.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="grid gap-1.5">
              <Label htmlFor="aviso-titulo" className="text-xs font-semibold">Título do Aviso *</Label>
              <Input 
                id="aviso-titulo" 
                placeholder="Ex: Reunião Pedagógica Extraordinária..."
                value={editingAviso?.titulo || ""} 
                onChange={(e) => setEditingAviso(prev => ({ ...prev, titulo: e.target.value }))} 
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Link Externo Opcional */}
            <div className="grid gap-1.5">
              <Label htmlFor="aviso-link" className="text-xs font-semibold flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                Link Complementar / Material Externo (Opcional)
              </Label>
              <Input 
                id="aviso-link" 
                placeholder="https://drive.google.com/... ou https://..." 
                value={editingAviso?.link || ""} 
                onChange={(e) => setEditingAviso(prev => ({ ...prev, link: e.target.value }))} 
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Se informado, um botão seguro e acessível "Acessar Link" ficará disponível no card e na leitura detalhada do aviso.
              </p>
            </div>

            {/* Imagem (URL Opcional) */}
            <div className="grid gap-1.5">
              <Label htmlFor="aviso-imagem" className="text-xs font-semibold">Link da Imagem (URL Opcional)</Label>
              <div className="relative">
                <Input 
                  id="aviso-imagem" 
                  placeholder="https://exemplo.com/imagem.jpg" 
                  value={editingAviso?.imagem_url || ""} 
                  onChange={(e) => setEditingAviso(prev => ({ ...prev, imagem_url: e.target.value }))} 
                  className="pr-8 h-9 text-sm"
                />
                {editingAviso?.imagem_url && (
                  <button
                    type="button"
                    onClick={() => setEditingAviso(prev => ({ ...prev, imagem_url: "" }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Limpar imagem"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="grid gap-1.5">
              <Label htmlFor="aviso-conteudo" className="text-xs font-semibold">Conteúdo / Descrição do Aviso *</Label>
              <Textarea 
                id="aviso-conteudo" 
                rows={4} 
                placeholder="Descreva o comunicado ou detalhes do aviso..."
                value={editingAviso?.conteudo || ""} 
                onChange={(e) => setEditingAviso(prev => ({ ...prev, conteudo: e.target.value }))} 
                required
                className="text-sm resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingAviso?.id ? "Salvar Alterações" : "Publicar Aviso"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


