import { useState, useEffect, useMemo } from "react"
import { 
  FolderKanban, 
  Plus, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  Link as LinkIcon, 
  FileText, 
  CalendarCheck,
  ChevronRight,
  Info
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

export function CardBimestres() {
  const { usuario } = useAuth()
  const [itens, setItens] = useState<InformacaoBimestre[]>([])
  const [loading, setLoading] = useState(true)
  const [bimestreAtivo, setBimestreAtivo] = useState<number>(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<InformacaoBimestre> | null>(null)

  const [visualizandoInfo, setVisualizandoInfo] = useState<InformacaoBimestre | null>(null)

  const canManage = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'

  useEffect(() => {
    carregarInformacoes()
  }, [])

  async function carregarInformacoes() {
    try {
      const data = await getInformacoesBimestre()
      setItens(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const itensDoBimestre = useMemo(() => {
    return itens.filter(i => i.bimestre === bimestreAtivo)
  }, [itens, bimestreAtivo])

  // Contagem de itens por bimestre para badges nos botões
  const contagemPorBimestre = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    itens.forEach(item => {
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
      descricao: ""
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

  // Ícones e cores para os cards do bimestre
  const ICON_COLORS = [
    { bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900" },
    { bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-900" },
    { bg: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-900" },
    { bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900" },
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
        description: error?.message || "Verifique se a tabela foi configurada no banco de dados."
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
        description: error?.message || "Erro ao conectar com o banco de dados."
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Informações por Bimestre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Informações por Bimestre
          </h2>
        </div>

        {canManage && (
          <Button 
            size="sm" 
            onClick={handleOpenNovo} 
            className="h-8 text-xs font-semibold rounded-lg px-3 shadow-xs gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Informação</span>
          </Button>
        )}
      </div>

      {/* Abas dos 4 Bimestres (Estilo Sublinhado Elegante) */}
      <div className="flex items-center border-b border-border gap-6 overflow-x-auto select-none pt-1">
        {BIMESTRES.map((bim) => {
          const ativo = bimestreAtivo === bim.valor
          const count = contagemPorBimestre[bim.valor] || 0
          return (
            <button
              key={bim.valor}
              type="button"
              onClick={() => setBimestreAtivo(bim.valor)}
              className={`pb-2.5 text-xs sm:text-sm uppercase tracking-wider font-bold transition-all relative shrink-0 flex items-center gap-1.5 ${
                ativo
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
              }`}
            >
              <span>{bim.rotulo}</span>
              {count > 0 && (
                <span 
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                    ativo 
                      ? "bg-primary text-primary-foreground" 
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

      {/* Conteúdo do Bimestre Ativo em Grid */}
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Carregando informações do bimestre...
        </div>
      ) : itensDoBimestre.length === 0 ? (
        <div className="py-10 px-4 text-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center">
          <Info className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground/80">
            Nenhuma informação cadastrada no {bimestreAtivo}º Bimestre.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documentos, links e roteiros do período aparecerão aqui.
          </p>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNovo}
              className="h-8 text-xs font-semibold text-primary mt-3 border-primary/30"
            >
              + Inserir informação
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {itensDoBimestre.map((item, index) => {
            const colorTheme = ICON_COLORS[index % ICON_COLORS.length]
            const hasLink = Boolean(item.link && item.link.trim())

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                role="button"
                tabIndex={0}
                className="group relative text-left rounded-xl border border-border/80 bg-card p-4 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary select-none"
              >
                {/* Linha de Ícone e Ações */}
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${colorTheme.bg}`}>
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="flex items-center gap-1">
                    {hasLink ? (
                      <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-0.5 group-hover:underline">
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Info className="h-3 w-3" />
                      </span>
                    )}

                    {/* Botões de Ação para Admin / Coordenador */}
                    {canManage && (
                      <div 
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 p-0.5 rounded-lg border border-border shadow-2xs z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); handleOpenEditar(item); }}
                          title="Editar informação"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); handleExcluir(item.id); }}
                          title="Excluir informação"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Título e Descrição */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {item.titulo}
                  </h3>
                  {item.descricao && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.descricao}
                    </p>
                  )}
                </div>

                {/* Rodapé do Card */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground/80 font-medium">
                  <span className="text-[10px] font-semibold uppercase text-primary/80">
                    {bimestreAtivo}º Bimestre
                  </span>
                  <span className="text-[10px] text-primary font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    {hasLink ? "Abrir link" : "Ver detalhes"}
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: VISUALIZAR INFORMAÇÃO COMPLETA (TEXTO PURO) */}
      <Dialog open={!!visualizandoInfo} onOpenChange={(open) => !open && setVisualizandoInfo(null)}>
        <DialogContent className="sm:max-w-md">
          {visualizandoInfo && (
            <>
              <DialogHeader>
                <div className="text-[10px] font-bold tracking-wider uppercase text-primary mb-1">
                  {visualizandoInfo.bimestre}º Bimestre
                </div>
                <DialogTitle className="text-lg font-bold text-foreground leading-snug">
                  {visualizandoInfo.titulo}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                {visualizandoInfo.descricao && (
                  <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/10 p-3.5 border border-border/60">
                    {visualizandoInfo.descricao}
                  </div>
                )}

                {visualizandoInfo.link && (
                  <div className="pt-1">
                    <a
                      href={formatarUrl(visualizandoInfo.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
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
                  <Button onClick={() => window.open(formatarUrl(visualizandoInfo.link), '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Acessar Link
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Adição / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
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
                className="h-9 text-xs font-semibold shadow-xs"
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

