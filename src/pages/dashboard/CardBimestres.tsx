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
  Info
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
    <>
      <Card className="overflow-hidden border-border/80 shadow-xs bg-card transition-all">
        {/* Cabeçalho compacto do Card */}
        <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight leading-tight">
                  Informações por Bimestre
                </CardTitle>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Links, avisos e documentos organizados por período letivo
                </p>
              </div>
            </div>

            {canManage && (
              <Button 
                size="sm" 
                onClick={handleOpenNovo} 
                className="h-8 text-xs font-semibold rounded-lg px-3 shadow-2xs gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">+</span>
              </Button>
            )}
          </div>

          {/* Abas dos 4 Bimestres */}
          <div className="grid grid-cols-4 gap-1.5 pt-3">
            {BIMESTRES.map((bim) => {
              const ativo = bimestreAtivo === bim.valor
              const count = contagemPorBimestre[bim.valor] || 0
              return (
                <button
                  key={bim.valor}
                  type="button"
                  onClick={() => setBimestreAtivo(bim.valor)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all select-none border ${
                    ativo
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background hover:bg-muted text-foreground/80 hover:text-foreground border-border"
                  }`}
                >
                  <span className="truncate hidden sm:inline">{bim.rotulo}</span>
                  <span className="truncate sm:hidden">{bim.curto}</span>
                  {count > 0 && (
                    <span 
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                        ativo 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-muted-foreground/15 text-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </CardHeader>

        {/* Conteúdo do Bimestre Ativo */}
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              Carregando informações do bimestre...
            </div>
          ) : itensDoBimestre.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center">
              <Info className="h-5 w-5 text-muted-foreground mb-1.5" />
              <p className="text-xs font-semibold text-foreground/80">
                Nenhuma informação cadastrada no {bimestreAtivo}º Bimestre.
              </p>
              {canManage && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleOpenNovo}
                  className="h-7 text-xs font-semibold text-primary mt-1 p-0"
                >
                  + Inserir primeira informação
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {itensDoBimestre.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-border bg-background p-3 sm:p-3.5 hover:border-primary/50 hover:shadow-2xs transition-all flex flex-col gap-1.5"
                >
                  {/* Linha de Título e Ações */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug break-words">
                        {item.titulo}
                      </h4>
                    </div>

                    {/* Botões de Ação para Admin / Coordenador */}
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 p-0.5 rounded-lg border border-border shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditar(item)}
                          title="Editar informação"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleExcluir(item.id)}
                          title="Excluir informação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  {item.descricao && (
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pl-7">
                      {item.descricao}
                    </p>
                  )}

                  {/* Link (se cadastrado) */}
                  {item.link && (
                    <div className="pl-7 pt-1">
                      <a
                        href={formatarUrl(item.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-md border border-primary/20 group/link transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[260px] sm:max-w-md">
                          {item.link}
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  )
}
