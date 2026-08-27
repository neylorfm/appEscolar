import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { 
  Megaphone, 
  Search, 
  Filter, 
  ExternalLink, 
  Calendar, 
  LogIn, 
  LayoutDashboard, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Sparkles, 
  RefreshCw, 
  Sun, 
  Moon, 
  ArrowUpDown,
  GripVertical,
  BookOpen,
  School,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useInstituicao } from "@/contexts/InstituicaoContext"
import { useTheme } from "@/components/ThemeProvider"
import { 
  AvisoPublico, 
  getAvisosPublicos, 
  deleteAvisoPublico, 
  reordenarAvisosPublicos 
} from "@/services/areaPublica"
import { GerenciarAreaPublicaModal } from "./GerenciarAreaPublicaModal"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const CATEGORIAS_PADRAO = [
  { rotulo: "TODAS", valor: "TODAS", cor: "" },
  { rotulo: "COMUNICADO", valor: "COMUNICADO", cor: "bg-[#ede4f8] text-[#593285] dark:bg-[#593285]/30 dark:text-[#d3b6f5]" },
  { rotulo: "EVENTO", valor: "EVENTO", cor: "bg-[#def2e6] text-[#1e6b45] dark:bg-[#1e6b45]/30 dark:text-[#9fe3be]" },
  { rotulo: "PRAZO", valor: "PRAZO", cor: "bg-[#fce4d6] text-[#8a431d] dark:bg-[#8a431d]/30 dark:text-[#f5be9e]" },
  { rotulo: "IMPORTANTE", valor: "IMPORTANTE", cor: "bg-[#fadcd9] text-[#8e2825] dark:bg-[#8e2825]/30 dark:text-[#f7a8a6]" },
  { rotulo: "COMUNIDADE", valor: "COMUNIDADE", cor: "bg-[#d8f0f8] text-[#136380] dark:bg-[#136380]/30 dark:text-[#90ddf0]" },
  { rotulo: "AVISO GERAL", valor: "AVISO GERAL", cor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
]

function getCategoriaBadge(categoria?: string | null) {
  const cat = categoria?.toUpperCase().trim() || "COMUNICADO"
  const encontrada = CATEGORIAS_PADRAO.find(c => c.valor === cat)
  if (encontrada && encontrada.cor) return encontrada
  return {
    rotulo: categoria?.toUpperCase() || "COMUNICADO",
    valor: cat,
    cor: "bg-[#ede4f8] text-[#593285] dark:bg-[#593285]/30 dark:text-[#d3b6f5]"
  }
}

export default function AreaPublicaPage() {
  const { usuario } = useAuth()
  const { configuracoes } = useInstituicao()
  const { theme, setTheme } = useTheme()

  const [avisos, setAvisos] = useState<AvisoPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("TODAS")

  // Modais
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [avisoParaEditar, setAvisoParaEditar] = useState<AvisoPublico | null>(null)
  const [visualizandoAviso, setVisualizandoAviso] = useState<AvisoPublico | null>(null)
  const [modalReordenarAberto, setModalReordenarAberto] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const isGestor = usuario?.papel === "Administrador" || usuario?.papel === "Coordenador"

  useEffect(() => {
    carregarAvisos()
  }, [])

  async function carregarAvisos(forceRefresh = false) {
    try {
      if (forceRefresh) setRefreshing(true)
      else setLoading(true)
      
      const data = await getAvisosPublicos(forceRefresh)
      setAvisos(data)
    } catch (err) {
      console.error("Erro ao buscar comunicados da Área Pública:", err)
      toast.error("Erro ao carregar comunicados da Área Pública")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleExcluir(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Deseja realmente remover este comunicado da Área Pública?")) return

    try {
      await deleteAvisoPublico(id)
      toast.success("Comunicado removido da Área Pública")
      if (visualizandoAviso?.id === id) setVisualizandoAviso(null)
      carregarAvisos(true)
    } catch (err: any) {
      console.error("Erro ao excluir:", err)
      toast.error("Erro ao remover comunicado", { description: err?.message })
    }
  }

  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const novaLista = [...avisos]
    const [removido] = novaLista.splice(draggedIndex, 1)
    novaLista.splice(targetIndex, 0, removido)

    setDraggedIndex(null)
    setAvisos(novaLista)
    toast.success("Ordem dos comunicados atualizada!")
    await reordenarAvisosPublicos(novaLista)
  }

  // Filtragem no cliente (Zero chamadas de API adicionais!)
  const avisosFiltrados = useMemo(() => {
    return avisos.filter(aviso => {
      const matchBusca = !busca.trim() || 
        aviso.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        aviso.conteudo.toLowerCase().includes(busca.toLowerCase())
      
      const matchCategoria = categoriaFiltro === "TODAS" || 
        (aviso.categoria || "COMUNICADO").toUpperCase().trim() === categoriaFiltro
      
      return matchBusca && matchCategoria
    })
  }, [avisos, busca, categoriaFiltro])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground flex flex-col selection:bg-[#7f1d1d] selection:text-white">
      {/* ========================================================================= */}
      {/* CABEÇALHO PÚBLICO INSTITUCIONAL                                           */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-all shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Logo e Nome da Instituição */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#7f1d1d] text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md group-hover:scale-105 transition-transform shrink-0">
              {configuracoes?.sigla || "AS"}
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-[#7f1d1d] dark:text-[#f8b4bc] leading-snug">
                {configuracoes?.nome || "EEMTI ANTONIETA SIQUEIRA"}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Canal Oficial de Notícias e Comunicados
              </span>
            </div>
          </Link>

          {/* Ações do Topo: Alternador de Tema e Acesso do Professor */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Alternador de Tema Visual */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-xl border-border/80 hover:bg-muted/80 transition-colors"
              title="Alternar Tema Visual"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>

            {/* Se logado como Coordenador/Admin: Botão de Adicionar Aviso */}
            {isGestor && (
              <>
                <Button
                  onClick={() => {
                    setAvisoParaEditar(null)
                    setModalCriarAberto(true)
                  }}
                  className="h-9 px-3 text-xs font-bold bg-[#7f1d1d] hover:bg-[#661717] text-white rounded-xl shadow-sm gap-1.5 hidden sm:inline-flex"
                  title="Cadastrar novo comunicado na Área Pública"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Comunicado</span>
                </Button>
                {avisos.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setModalReordenarAberto(true)}
                    className="h-9 px-2.5 text-xs font-bold border-border text-foreground hover:bg-muted rounded-xl hidden md:inline-flex gap-1"
                    title="Reordenar comunicados"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>Reordenar</span>
                  </Button>
                )}
              </>
            )}

            {/* Botão de Acesso / Login do Professor */}
            {usuario ? (
              <Link to="/links">
                <Button
                  variant="outline"
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold gap-2 rounded-xl border-[#7f1d1d]/30 text-[#7f1d1d] dark:text-[#f8b4bc] hover:bg-[#7f1d1d]/10 transition-all shadow-2xs"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#7f1d1d] dark:text-[#f8b4bc]" />
                  <span className="hidden sm:inline">Acessar Meu Painel</span>
                  <span className="sm:hidden">Painel</span>
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button
                  className="h-9 sm:h-10 px-3.5 sm:px-5 text-xs sm:text-sm font-bold bg-[#7f1d1d] hover:bg-[#661717] text-white gap-2 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Área do Professor</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS E BUSCA (100% Otimizada no Cliente)                      */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full flex flex-col gap-5">
        {/* Botão Novo Comunicado Mobile para Gestores */}
        {isGestor && (
          <div className="flex sm:hidden items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Painel de Gestão:</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setAvisoParaEditar(null)
                  setModalCriarAberto(true)
                }}
                className="h-7 px-2.5 text-xs font-bold bg-[#7f1d1d] text-white rounded-lg gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Novo</span>
              </Button>
              {avisos.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalReordenarAberto(true)}
                  className="h-7 px-2 text-xs font-bold rounded-lg"
                >
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar comunicados por palavra-chave..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs sm:text-sm font-medium rounded-xl"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Categorias e Botão de Atualizar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {CATEGORIAS_PADRAO.map(cat => (
              <button
                key={cat.valor}
                type="button"
                onClick={() => setCategoriaFiltro(cat.valor)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  categoriaFiltro === cat.valor
                    ? "bg-[#7f1d1d] text-white border-[#7f1d1d] shadow-2xs"
                    : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted"
                }`}
              >
                {cat.rotulo}
              </button>
            ))}

            <Button
              variant="outline"
              size="icon"
              onClick={() => carregarAvisos(true)}
              disabled={refreshing}
              className="h-9 w-9 shrink-0 rounded-xl"
              title="Atualizar lista de comunicados"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LISTAGEM DE CARDS DE COMUNICADOS                                          */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7f1d1d] border-t-transparent" />
            <span className="text-xs font-semibold text-muted-foreground animate-pulse">
              Carregando comunicados oficiais...
            </span>
          </div>
        ) : avisosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-card border border-border/80 shadow-xs">
            <div className="p-4 rounded-3xl bg-muted/60 text-muted-foreground mb-3">
              <Megaphone className="h-10 w-10 text-[#7f1d1d]/60 dark:text-[#f8b4bc]/60" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum comunicado encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1">
              {busca || categoriaFiltro !== "TODAS"
                ? "Tente ajustar os termos de busca ou selecionar outra categoria acima."
                : "No momento não há comunicados públicos publicados na Área Pública."}
            </p>
            {(busca || categoriaFiltro !== "TODAS") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBusca("")
                  setCategoriaFiltro("TODAS")
                }}
                className="mt-4 text-xs font-bold rounded-xl"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {avisosFiltrados.map((aviso) => {
              const badgeCat = getCategoriaBadge(aviso.categoria)
              const dataFormatada = format(new Date(aviso.data_publicacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

              return (
                <article
                  key={aviso.id}
                  onClick={() => setVisualizandoAviso(aviso)}
                  className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/80 hover:border-[#7f1d1d]/40 dark:hover:border-[#f8b4bc]/40 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  {/* Imagem Externa (se houver) */}
                  {aviso.imagem_url && (
                    <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-muted/30 border-b border-border/60">
                      <img
                        src={aviso.imagem_url}
                        alt={aviso.titulo}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none"
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}

                  <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                    {/* Topo do Card: Categoria e Data */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${badgeCat.cor}`}>
                        {badgeCat.rotulo}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <time dateTime={aviso.data_publicacao}>{dataFormatada}</time>
                      </div>
                    </div>

                    {/* Título */}
                    <h2 className="text-base sm:text-lg font-extrabold text-foreground group-hover:text-[#7f1d1d] dark:group-hover:text-[#f8b4bc] transition-colors leading-snug line-clamp-2">
                      {aviso.titulo}
                    </h2>

                    {/* Conteúdo Truncado */}
                    <p className="text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed line-clamp-3">
                      {aviso.conteudo}
                    </p>
                  </div>

                  {/* Rodapé do Card: Links de Ação e Ações de Gestor */}
                  <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#7f1d1d] dark:text-[#f8b4bc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Ler Comunicado</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>

                    {/* Botão de Link Externo se houver */}
                    {aviso.link && (
                      <a
                        href={aviso.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
                        title="Acessar anexo ou site oficial"
                      >
                        <span>Anexo</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {/* Ações de Gestor (Editar / Excluir) */}
                    {isGestor && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAvisoParaEditar(aviso)
                            setModalCriarAberto(true)
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Editar comunicado"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleExcluir(aviso.id, e)}
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          title="Excluir comunicado"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* RODAPÉ INSTITUCIONAL                                                      */}
      {/* ========================================================================= */}
      <footer className="border-t border-border/80 bg-card py-6 px-4 sm:px-6 lg:px-8 mt-12 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-[#7f1d1d] dark:text-[#f8b4bc]" />
            <span className="font-bold text-foreground">{configuracoes?.nome || "EEMTI ANTONIETA SIQUEIRA"}</span>
          </div>
          <span>Ambiente Escolar Integrado • Desenvolvido para a Comunidade Escolar</span>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL DE LEITURA INTEGRAL DO COMUNICADO                                   */}
      {/* ========================================================================= */}
      <Dialog open={!!visualizandoAviso} onOpenChange={(open) => !open && setVisualizandoAviso(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {visualizandoAviso && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${getCategoriaBadge(visualizandoAviso.categoria).cor}`}>
                    {getCategoriaBadge(visualizandoAviso.categoria).rotulo}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {format(new Date(visualizandoAviso.data_publicacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-[#7f1d1d] dark:text-[#f8b4bc] leading-snug">
                  {visualizandoAviso.titulo}
                </DialogTitle>
              </DialogHeader>

              {/* Imagem em Destaque */}
              {visualizandoAviso.imagem_url && (
                <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 my-2">
                  <img
                    src={visualizandoAviso.imagem_url}
                    alt={visualizandoAviso.titulo}
                    className="w-full max-h-[380px] object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Conteúdo Integral */}
              <div className="py-2 text-sm sm:text-base text-foreground font-normal leading-relaxed whitespace-pre-line">
                {visualizandoAviso.conteudo}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-border pt-3 mt-3">
                {visualizandoAviso.link ? (
                  <a
                    href={visualizandoAviso.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#7f1d1d] hover:bg-[#661717] text-white shadow-xs"
                  >
                    <span>Abrir Arquivo / Link Oficial</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : <div />}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVisualizandoAviso(null)}
                  className="text-xs font-bold"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação e Edição */}
      <GerenciarAreaPublicaModal
        open={modalCriarAberto}
        onOpenChange={setModalCriarAberto}
        avisoParaEditar={avisoParaEditar}
        onSuccess={() => carregarAvisos(true)}
      />

      {/* ========================================================================= */}
      {/* MODAL DE REORDENAÇÃO (Admin / Coordenador)                                */}
      {/* ========================================================================= */}
      <Dialog open={modalReordenarAberto} onOpenChange={setModalReordenarAberto}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#7f1d1d] dark:text-[#f8b4bc]">
              <ArrowUpDown className="h-5 w-5" />
              Reordenar Comunicados da Área Pública
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Arraste os comunicados para cima ou para baixo para ajustar a ordem de exibição na página inicial.
          </p>

          <div className="flex flex-col gap-2 py-2">
            {avisos.map((aviso, idx) => (
              <div
                key={aviso.id}
                draggable
                onDragStart={() => setDraggedIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/60 cursor-grab active:cursor-grabbing transition-all select-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-extrabold text-xs text-muted-foreground w-6">#{idx + 1}</span>
                <span className="font-bold text-xs truncate flex-1">{aviso.titulo}</span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setModalReordenarAberto(false)}
              className="text-xs font-bold bg-[#7f1d1d] hover:bg-[#661717] text-white"
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
