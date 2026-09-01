import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Camera, 
  RotateCcw, 
  Trash2, 
  Cloud, 
  Clock, 
  AlertTriangle,
  Plus
} from "lucide-react"
import { 
  GradeSnapshot, 
  getSnapshotsGrade, 
  salvarSnapshotGrade, 
  restaurarSnapshotGrade, 
  excluirSnapshotGrade 
} from "@/services/gradeHorarios"
import { toast } from "sonner"

interface SnapshotsGradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestauracaoConcluida: () => Promise<void>
  totalAulasAtuais: number
}

export function SnapshotsGradeModal({
  open,
  onOpenChange,
  onRestauracaoConcluida,
  totalAulasAtuais
}: SnapshotsGradeModalProps) {
  const [snapshots, setSnapshots] = useState<GradeSnapshot[]>([])
  const [carregando, setCarregando] = useState<boolean>(false)
  const [salvando, setSalvando] = useState<boolean>(false)
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [novoTitulo, setNovoTitulo] = useState<string>("")
  const [confirmandoRestauracao, setConfirmandoRestauracao] = useState<GradeSnapshot | null>(null)

  useEffect(() => {
    if (open) {
      carregarSnapshots()
      setNovoTitulo("")
      setConfirmandoRestauracao(null)
    }
  }, [open])

  async function carregarSnapshots() {
    try {
      setCarregando(true)
      const data = await getSnapshotsGrade()
      setSnapshots(data)
    } catch (err) {
      console.error("Erro ao carregar snapshots:", err)
      toast.error("Não foi possível carregar o histórico de versões.")
    } finally {
      setCarregando(false)
    }
  }

  async function handleSalvarSnapshot(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!novoTitulo.trim()) {
      toast.warning("Digite um nome para identificar este ponto de restauração.")
      return
    }

    try {
      setSalvando(true)
      const novo = await salvarSnapshotGrade(novoTitulo.trim())
      setSnapshots(prev => [novo, ...prev])
      setNovoTitulo("")
      toast.success("Ponto de restauração salvo na nuvem!", {
        description: `"${novo.titulo}" com ${novo.total_aulas} aulas registradas.`
      })
    } catch (err: any) {
      toast.error("Erro ao salvar snapshot: " + (err.message || "Tente novamente."))
    } finally {
      setSalvando(false)
    }
  }

  async function handleConfirmarRestauracao(snapshot: GradeSnapshot) {
    try {
      setRestaurandoId(snapshot.id)
      await restaurarSnapshotGrade(snapshot)
      await onRestauracaoConcluida()
      setConfirmandoRestauracao(null)
      toast.success("Rascunho restaurado com sucesso!", {
        description: `A versão "${snapshot.titulo}" agora está ativa para edição.`
      })
      onOpenChange(false)
    } catch (err: any) {
      toast.error("Erro ao restaurar: " + (err.message || "Tente novamente."))
    } finally {
      setRestaurandoId(null)
    }
  }

  async function handleExcluir(snapshotId: string, titulo: string) {
    try {
      setExcluindoId(snapshotId)
      await excluirSnapshotGrade(snapshotId)
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId))
      toast.success(`Versão "${titulo}" excluída com sucesso.`)
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err.message || "Tente novamente."))
    } finally {
      setExcluindoId(null)
    }
  }

  function formatarDataHora(dataIso: string) {
    try {
      const d = new Date(dataIso)
      const diaMesAno = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const horaMin = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `${diaMesAno} às ${horaMin}`
    } catch {
      return dataIso
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <span>Pontos de Restauração (Snapshots)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-extrabold">
                  Nuvem
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Salve cópias do rascunho para testar diferentes distribuições e restaurar com 1 clique.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Caixa para Criar Novo Ponto de Restauração */}
          <form onSubmit={handleSalvarSnapshot} className="p-3.5 rounded-2xl border border-border bg-muted/30 space-y-3">
            <Label htmlFor="nome-snapshot" className="text-xs font-black uppercase text-foreground tracking-wider flex items-center justify-between">
              <span>Criar Nova Foto do Rascunho Atual</span>
              <span className="text-[10px] text-muted-foreground font-semibold lowercase">
                ({totalAulasAtuais} aulas preenchidas)
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="nome-snapshot"
                placeholder="Ex: Antes de mexer na Matemática • Opção A"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                disabled={salvando}
                className="h-9 text-xs font-semibold bg-card"
              />
              <Button
                type="submit"
                size="sm"
                disabled={salvando || !novoTitulo.trim()}
                className="h-9 px-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{salvando ? "Salvando..." : "Salvar Foto"}</span>
              </Button>
            </div>
          </form>

          {/* Modal de Confirmação de Restauração em Destaque */}
          {confirmandoRestauracao && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2 text-amber-950 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-sm block">
                    Deseja restaurar "{confirmandoRestauracao.titulo}"?
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    O rascunho de edição atual será substituído pelas {confirmandoRestauracao.total_aulas} aulas desta versão ({formatarDataHora(confirmandoRestauracao.created_at)}).
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmandoRestauracao(null)}
                  className="h-7 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(restaurandoId)}
                  onClick={() => handleConfirmarRestauracao(confirmandoRestauracao)}
                  className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{restaurandoId ? "Restaurando..." : "Confirmar Restauração"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Snapshots Gravados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground px-1">
              <span>Versões Salvas ({snapshots.length})</span>
              <span className="text-[10px] lowercase font-normal">sincronizadas na nuvem</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {carregando ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Carregando pontos de restauração...
                </div>
              ) : snapshots.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  Nenhum ponto de restauração salvo ainda.
                  <span className="block text-[11px] text-muted-foreground/70 mt-1">
                    Digite um nome acima para salvar sua primeira versão de segurança!
                  </span>
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 rounded-xl border border-border bg-card hover:border-border/80 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-foreground truncate">
                          {snap.titulo}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          {snap.total_aulas} aulas
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatarDataHora(snap.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Cloud className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          {snap.autor_nome || "Coordenador"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmandoRestauracao(snap)}
                        disabled={Boolean(restaurandoId) || Boolean(excluindoId)}
                        className="h-8 px-2.5 text-xs font-bold gap-1 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 border-purple-500/30"
                        title="Restaurar esta versão para o rascunho ativo"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Restaurar</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExcluir(snap.id, snap.titulo)}
                        disabled={excluindoId === snap.id || Boolean(restaurandoId)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                        title="Excluir este ponto de restauração"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
