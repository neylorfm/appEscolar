import { useState, useMemo } from "react"
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
import { 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Search
} from "lucide-react"
import { GradeHorarioItem, analisarJanelasDocentes, NOMES_DIAS, DIAS_SEMANA } from "@/services/gradeHorarios"

interface RadarJanelasDocentesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itensGrade: GradeHorarioItem[]
}

export function RadarJanelasDocentesModal({
  open,
  onOpenChange,
  itensGrade
}: RadarJanelasDocentesModalProps) {
  const [buscaDocente, setBuscaDocente] = useState<string>("")
  const [diaFiltro, setDiaFiltro] = useState<string>("TODOS")

  const todasJanelas = useMemo(() => {
    return analisarJanelasDocentes(itensGrade)
  }, [itensGrade])

  const janelasFiltradas = useMemo(() => {
    return todasJanelas.filter(item => {
      if (diaFiltro !== "TODOS" && item.dia !== diaFiltro) return false
      if (buscaDocente.trim()) {
        const termo = buscaDocente.trim().toUpperCase()
        if (!item.professor.toUpperCase().includes(termo)) return false
      }
      return true
    })
  }, [todasJanelas, diaFiltro, buscaDocente])

  const totalJanelasGeral = useMemo(() => {
    return todasJanelas.reduce((acc, curr) => acc + curr.totalJanelas, 0)
  }, [todasJanelas])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <span>Radar de Janelas Vagas Docentes</span>
                {totalJanelasGeral > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold">
                    {totalJanelasGeral} {totalJanelasGeral === 1 ? "janela detectada" : "janelas detectadas"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold">
                    Grade Otimizada
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Identifique horários ociosos entre a primeira e a última aula do dia de cada professor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Filtrar por Dia:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <Button
                  type="button"
                  variant={diaFiltro === "TODOS" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDiaFiltro("TODOS")}
                  className="h-7 px-2 text-xs font-bold"
                >
                  Todos
                </Button>
                {DIAS_SEMANA.map((dia) => (
                  <Button
                    key={dia}
                    type="button"
                    variant={diaFiltro === dia ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDiaFiltro(dia)}
                    className="h-7 px-2 text-xs font-bold"
                  >
                    {dia}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Buscar Professor:</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nome do professor..."
                  value={buscaDocente}
                  onChange={(e) => setBuscaDocente(e.target.value)}
                  className="h-8 text-xs pl-8 bg-card"
                />
              </div>
            </div>
          </div>

          {/* Lista de Ocorrências de Janelas */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {todasJanelas.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <span className="text-sm font-black text-emerald-950 dark:text-emerald-200 block">
                  Nenhuma janela vaga detectada!
                </span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 block">
                  Todos os professores com 2 ou mais aulas no dia estão com seus horários perfeitamente contínuos e compactados.
                </span>
              </div>
            ) : janelasFiltradas.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma janela encontrada com os filtros selecionados.
              </div>
            ) : (
              janelasFiltradas.map((item, idx) => (
                <div
                  key={`${item.professor}_${item.dia}_${item.segmento}_${idx}`}
                  className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-foreground truncate">
                        {item.professor}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[10px]">
                        {NOMES_DIAS[item.dia] || item.dia}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold text-[10px]">
                        {item.segmento === "NOTURNO" ? "Noturno" : "Integral"}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground font-medium">
                      Aulas alocadas: <strong className="text-foreground">{item.aulasAlocadas.map(a => `${a}ª`).join(', ')}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 bg-amber-500/15 border border-amber-500/30 p-2 rounded-xl text-amber-950 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block leading-tight">
                        {item.totalJanelas === 1 ? "Janela Ociosa:" : "Janelas Ociosas:"}
                      </span>
                      <span className="text-xs font-black text-amber-900 dark:text-amber-100">
                        {item.janelas.map(j => `${j}ª Aula`).join(' e ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
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
