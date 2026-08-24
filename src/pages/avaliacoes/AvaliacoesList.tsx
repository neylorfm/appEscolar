import { useState, useEffect, useMemo } from "react"
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  Link as LinkIcon, 
  FileText, 
  CalendarCheck,
  ChevronRight,
  Info,
  Search,
  X,
  BookOpen,
  FolderOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { 
  getInformacoesBimestre, 
  upsertInformacaoBimestre, 
  deleteInformacaoBimestre, 
  InformacaoBimestre 
} from "@/services/dashboard"
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

const BIMESTRES = [
  { valor: 1, rotulo: "1º Bimestre", curto: "1º Bim" },
  { valor: 2, rotulo: "2º Bimestre", curto: "2º Bim" },
  { valor: 3, rotulo: "3º Bimestre", curto: "3º Bim" },
  { valor: 4, rotulo: "4º Bimestre", curto: "4º Bim" },
]

export default function AvaliacoesList() {
  const { usuario } = useAuth()
  const [itens, setItens] = useState<InformacaoBimestre[]>([])
  const [loading, setLoading] = useState(true)
  const [bimestreAtivo, setBimestreAtivo] = useState<number>(1)
  const [filtroBusca, setFiltroBusca] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<InformacaoBimestre> | null>(null)
  const [visualizandoInfo, setVisualizandoInfo] = useState<InformacaoBimestre | null>(null)

  const canManage = usuario?.papel === "Administrador" || usuario?.papel === "Coordenador"

  useEffect(() => {
    carregarInformacoes()
  }, [])

  async function carregarInformacoes() {
    try {
      setLoading(true)
      const data = await getInformacoesBimestre()
      setItens(data)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar informações por bimestre.")
    } finally {
      setLoading(false)
    }
  }

  // Normalizador para busca insensível a acentos e maiúsculas
  const normalizar = (txt: string) =>
    (txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()

  const itensDoBimestre = useMemo(() => {
    const filtradosPorBimestre = itens.filter((i) => i.bimestre === bimestreAtivo)
    if (!filtroBusca.trim()) return filtradosPorBimestre

    const termo = normalizar(filtroBusca)
    return filtradosPorBimestre.filter((i) => {
      const matchTitulo = normalizar(i.titulo).includes(termo)
      const matchDesc = normalizar(i.descricao || "").includes(termo)
      const matchLink = normalizar(i.link || "").includes(termo)
      return matchTitulo || matchDesc || matchLink
    })
  }, [itens, bimestreAtivo, filtroBusca])

  // Contagem de itens por bimestre para badges nos botões
  const contagemPorBimestre = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    itens.forEach((item) => {
      if (counts[item.bimestre] !== undefined) {
        counts[item.bimestre]++
      }
    })
    return counts
  }, [itens])

  function handleOpenNovo() {
    setEditingItem({
      bimestre: bimestreAtivo,
      titulo: "",
      link: "",
      descricao: "",
    })
    setIsModalOpen(true)
  }

  function handleOpenEditar(item: InformacaoBimestre) {
    setEditingItem({ ...item })
    setIsModalOpen(true)
  }

  function formatarUrl(url?: string | null) {
    if (!url) return ""
    const trimmed = url.trim()
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  function handleItemClick(item: InformacaoBimestre) {
    if (item.link && item.link.trim()) {
      window.open(formatarUrl(item.link), "_blank", "noopener,noreferrer")
    } else {
      setVisualizandoInfo(item)
    }
  }

  const ICON_COLORS = [
    { bg: "bg-[#fce5e6] text-[#8a2531] dark:bg-[#8a2531]/30 dark:text-[#f8b4bc]" },
    { bg: "bg-[#fbe8da] text-[#944923] dark:bg-[#944923]/30 dark:text-[#f5be9e]" },
    { bg: "bg-[#ddf3f9] text-[#176e82] dark:bg-[#176e82]/30 dark:text-[#90ddf0]" },
    { bg: "bg-[#def2e6] text-[#1e6b45] dark:bg-[#1e6b45]/30 dark:text-[#9fe3be]" },
  ]

  async function handleSalvar() {
    if (!editingItem?.titulo || !editingItem.titulo.trim()) {
      toast.error("O título é obrigatório")
      return
    }

    if (!editingItem?.bimestre) {
      toast.error("Selecione o bimestre")
      return
    }

    setSaving(true)
    try {
      await upsertInformacaoBimestre({
        ...editingItem,
        titulo: editingItem.titulo.trim(),
        link: editingItem.link ? formatarUrl(editingItem.link) : null,
        descricao: editingItem.descricao ? editingItem.descricao.trim() : null,
      })

      toast.success(editingItem.id ? "Informação atualizada!" : "Informação adicionada com sucesso!")
      setIsModalOpen(false)
      setEditingItem(null)
      await carregarInformacoes()
    } catch (error: any) {
      console.error("Erro ao salvar informação bimestral:", error)
      toast.error("Erro ao salvar", {
        description: error?.message || "Verifique a conexão com o banco de dados.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta informação do bimestre?")) return

    try {
      await deleteInformacaoBimestre(id)
      toast.success("Informação removida!")
      await carregarInformacoes()
    } catch (error: any) {
      console.error("Erro ao excluir informação:", error)
      toast.error("Erro ao excluir", {
        description: error?.message || "Erro ao conectar com o banco de dados.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Cabeçalho Principal da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#7f1d1d]/10 text-[#7f1d1d] dark:bg-[#f8b4bc]/20 dark:text-[#f8b4bc]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Informações por Bimestre
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Roteiros de estudo, links de avaliações, simulados, gabaritos e documentos por período letivo.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <Button 
            onClick={handleOpenNovo} 
            className="h-10 text-xs sm:text-sm font-bold rounded-xl px-4 shadow-sm gap-2 bg-[#7f1d1d] hover:bg-[#661717] text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Informação</span>
          </Button>
        )}
      </div>

      {/* Barra Superior: Abas de Bimestres + Campo de Busca Dinâmica */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Abas dos 4 Bimestres */}
        <div className="flex items-center border-b md:border-b-0 border-border/80 gap-4 sm:gap-6 overflow-x-auto select-none">
          {BIMESTRES.map((bim) => {
            const ativo = bimestreAtivo === bim.valor
            const count = contagemPorBimestre[bim.valor] || 0
            return (
              <button
                key={bim.valor}
                type="button"
                onClick={() => setBimestreAtivo(bim.valor)}
                className={`pb-2.5 md:pb-2 text-xs sm:text-sm uppercase tracking-wider font-extrabold transition-all relative shrink-0 flex items-center gap-1.5 ${
                  ativo
                    ? "text-[#7f1d1d] dark:text-[#f8b4bc] border-b-2 border-[#7f1d1d] dark:border-[#f8b4bc]"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-b-2 border-transparent"
                }`}
              >
                <span>{bim.rotulo}</span>
                {count > 0 && (
                  <span 
                    className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold leading-tight ${
                      ativo 
                        ? "bg-[#7f1d1d] text-white dark:bg-[#f8b4bc] dark:text-zinc-900" 
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Campo de Busca Rápida Dinâmica */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por título, texto ou link..."
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs sm:text-sm font-semibold rounded-xl bg-card border-border/80"
          />
          {filtroBusca && (
            <button
              type="button"
              onClick={() => setFiltroBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo do Bimestre Ativo em Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <FolderOpen className="h-8 w-8 animate-bounce text-muted-foreground/60" />
          <span>Carregando informações do {bimestreAtivo}º Bimestre...</span>
        </div>
      ) : itensDoBimestre.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center">
          <Info className="h-10 w-10 text-muted-foreground/60 mb-2.5" />
          <p className="text-base sm:text-lg font-bold text-foreground/80">
            {filtroBusca 
              ? "Nenhuma informação corresponde à sua busca neste bimestre." 
              : `Nenhuma informação cadastrada no ${bimestreAtivo}º Bimestre.`}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
            {filtroBusca 
              ? "Tente buscar por outro termo ou limpe o campo de pesquisa." 
              : "Roteiros de estudo, links de formulários, gabaritos e comunicados do período aparecerão aqui."}
          </p>
          {canManage && !filtroBusca && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNovo}
              className="h-9 text-xs sm:text-sm font-semibold text-primary mt-4 border-primary/30 rounded-xl"
            >
              + Inserir primeira informação
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {itensDoBimestre.map((item, index) => {
            const colorTheme = ICON_COLORS[index % ICON_COLORS.length]
            const hasLink = Boolean(item.link && item.link.trim())

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                role="button"
                tabIndex={0}
                className="group relative text-left rounded-2xl border border-border/80 bg-card p-5 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary select-none shadow-xs"
              >
                {/* Linha de Ícone e Ações */}
                <div className="flex items-center justify-between">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-2xs ${colorTheme.bg}`}>
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasLink ? (
                      <span className="text-xs font-bold text-primary inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 group-hover:underline">
                        <span>Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-lg border border-border">
                        <Info className="h-3 w-3" />
                        <span>Texto</span>
                      </span>
                    )}

                    {/* Botões de Ação para Admin / Coordenador */}
                    {canManage && (
                      <div 
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 p-0.5 rounded-lg border border-border shadow-xs z-10 ml-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); handleOpenEditar(item); }}
                          title="Editar informação"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); handleExcluir(item.id); }}
                          title="Excluir informação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Título e Descrição */}
                <div className="space-y-1.5">
                  <h3 className="text-base lg:text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {item.titulo}
                  </h3>
                  {item.descricao && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {item.descricao}
                    </p>
                  )}
                </div>

                {/* Rodapé do Card */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span className="text-[11px] font-extrabold uppercase text-primary/90">
                    {bimestreAtivo}º Bimestre
                  </span>
                  <span className="text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {hasLink ? "Acessar recurso" : "Ver orientações"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: VISUALIZAR INFORMAÇÃO COMPLETA */}
      <Dialog open={!!visualizandoInfo} onOpenChange={(open) => !open && setVisualizandoInfo(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          {visualizandoInfo && (
            <>
              <DialogHeader>
                <div className="text-[11px] font-bold tracking-wider uppercase text-primary mb-1">
                  {visualizandoInfo.bimestre}º Bimestre
                </div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
                  {visualizandoInfo.titulo}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                {visualizandoInfo.descricao && (
                  <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/20 p-4 border border-border/70">
                    {visualizandoInfo.descricao}
                  </div>
                )}

                {visualizandoInfo.link && (
                  <div className="pt-1">
                    <a
                      href={formatarUrl(visualizandoInfo.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-primary/10 px-3.5 py-2 rounded-xl border border-primary/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="truncate max-w-[280px]">{visualizandoInfo.link}</span>
                    </a>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setVisualizandoInfo(null)}>
                  Fechar
                </Button>
                {visualizandoInfo.link && (
                  <Button onClick={() => window.open(formatarUrl(visualizandoInfo.link), "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Acessar Link
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: ADIÇÃO / EDIÇÃO DE INFORMAÇÃO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              {editingItem?.id ? "Editar Informação do Bimestre" : "Adicionar Informação ao Bimestre"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSalvar(); }} className="space-y-4 py-2">
            {/* Seletor de Bimestre */}
            <div className="space-y-1.5">
              <Label htmlFor="bimestre-select" className="text-xs font-semibold">
                Bimestre
              </Label>
              <Select
                value={editingItem?.bimestre?.toString() || "1"}
                onValueChange={(val) => setEditingItem(prev => ({ ...prev, bimestre: Number(val) }))}
              >
                <SelectTrigger id="bimestre-select" className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o bimestre" />
                </SelectTrigger>
                <SelectContent>
                  {BIMESTRES.map((b) => (
                    <SelectItem key={b.valor} value={b.valor.toString()}>
                      {b.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="info-titulo" className="text-xs font-semibold">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="info-titulo"
                placeholder="Ex: Roteiro de Estudos, Link da Prova, Gabarito Oficial..."
                value={editingItem?.titulo || ""}
                onChange={(e) => setEditingItem(prev => ({ ...prev, titulo: e.target.value }))}
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Link */}
            <div className="space-y-1.5">
              <Label htmlFor="info-link" className="text-xs font-semibold flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Link (Opcional)
              </Label>
              <Input
                id="info-link"
                placeholder="https://drive.google.com/... ou https://..."
                value={editingItem?.link || ""}
                onChange={(e) => setEditingItem(prev => ({ ...prev, link: e.target.value }))}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Insira o link para materiais, planilhas, pastas ou formulários.
              </p>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="info-descricao" className="text-xs font-semibold">
                Descrição (Opcional)
              </Label>
              <Textarea
                id="info-descricao"
                placeholder="Orientações breves sobre as datas, prazos ou conteúdos..."
                value={editingItem?.descricao || ""}
                onChange={(e) => setEditingItem(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-9 text-xs font-bold shadow-xs bg-[#7f1d1d] hover:bg-[#661717] text-white"
              >
                {saving ? "Salvando..." : editingItem?.id ? "Salvar Alterações" : "Adicionar Informação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
