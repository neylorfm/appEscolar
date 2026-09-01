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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { GradeHorarioItem, normalizarNomeTurma } from "@/services/gradeHorarios"

interface MetasCurricularesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turmas: string[]
  itensGrade: GradeHorarioItem[]
  segmento: string
}

export function MetasCurricularesModal({
  open,
  onOpenChange,
  turmas,
  itensGrade,
  segmento
}: MetasCurricularesModalProps) {
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("TODAS")
  const [buscaDisciplina, setBuscaDisciplina] = useState<string>("")

  // Capacidade máxima de aulas semanais por turma
  const totalAulasSemanaTurma = useMemo(() => {
    if (segmento === "NOTURNO") return 20 // 4 aulas x 5 dias
    if (segmento === "INTEGRAL_MANHA") return 25 // 5 aulas x 5 dias
    if (segmento === "INTEGRAL_TARDE") return 20 // 4 aulas x 5 dias
    return 45 // INTEGRAL_COMPLETO: 9 aulas x 5 dias
  }, [segmento])

  // Processa o resumo curricular agrupado por turma e disciplina
  const relatorioCurricular = useMemo(() => {
    const mapa = new Map<string, {
      turma: string
      totalAulas: number
      disciplinas: Map<string, {
        disciplina: string
        aulas: number
        professores: Set<string>
      }>
    }>()

    for (const t of turmas) {
      mapa.set(normalizarNomeTurma(t), {
        turma: t,
        totalAulas: 0,
        disciplinas: new Map()
      })
    }

    for (const item of itensGrade) {
      const chaveTurma = normalizarNomeTurma(item.turma_nome)
      let infoTurma = mapa.get(chaveTurma)
      if (!infoTurma) {
        infoTurma = {
          turma: item.turma_nome,
          totalAulas: 0,
          disciplinas: new Map()
        }
        mapa.set(chaveTurma, infoTurma)
      }

      infoTurma.totalAulas++
      const disc = item.disciplina_nome.trim().toUpperCase()
      let infoDisc = infoTurma.disciplinas.get(disc)
      if (!infoDisc) {
        infoDisc = {
          disciplina: disc,
          aulas: 0,
          professores: new Set()
        }
        infoTurma.disciplinas.set(disc, infoDisc)
      }
      infoDisc.aulas++
      if (item.professor_nome) {
        infoDisc.professores.add(item.professor_nome)
      }
    }

    const resultado = Array.from(mapa.values()).map(t => ({
      turma: t.turma,
      totalAulas: t.totalAulas,
      vagasRestantes: Math.max(0, totalAulasSemanaTurma - t.totalAulas),
      concluida: t.totalAulas >= totalAulasSemanaTurma,
      disciplinas: Array.from(t.disciplinas.values()).sort((a, b) => b.aulas - a.aulas)
    }))

    return resultado
  }, [turmas, itensGrade, totalAulasSemanaTurma])

  // Filtragem por turma e busca
  const turmasFiltradas = useMemo(() => {
    return relatorioCurricular.filter(t => {
      if (turmaSelecionada !== "TODAS" && t.turma !== turmaSelecionada) {
        return false
      }
      return true
    })
  }, [relatorioCurricular, turmaSelecionada])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground">
                Painel de Carga Horária & Metas Curriculares
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Acompanhe a distribuição semanal de aulas de cada disciplina por turma.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Filtros de Turma e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Filtrar por Turma:</span>
              <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                <SelectTrigger className="h-8.5 text-xs bg-card font-semibold">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs font-bold">
                    Todas as Turmas ({turmas.length})
                  </SelectItem>
                  {turmas.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Buscar Disciplina:</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Ex: Matemática, Física..."
                  value={buscaDisciplina}
                  onChange={(e) => setBuscaDisciplina(e.target.value)}
                  className="h-8.5 pl-8 text-xs bg-card"
                />
              </div>
            </div>
          </div>

          {/* Lista de Turmas com suas Matérias */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {turmasFiltradas.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma turma encontrada.
              </div>
            ) : (
              turmasFiltradas.map((itemTurma) => {
                const disciplinasExibidas = itemTurma.disciplinas.filter(d =>
                  !buscaDisciplina || d.disciplina.toLowerCase().includes(buscaDisciplina.toLowerCase())
                )

                const perc = Math.min(100, Math.round((itemTurma.totalAulas / totalAulasSemanaTurma) * 100))

                return (
                  <div
                    key={itemTurma.turma}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs space-y-2.5 p-3.5"
                  >
                    {/* Cabeçalho da Turma */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs">
                          {itemTurma.turma}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {itemTurma.totalAulas} de {totalAulasSemanaTurma} aulas na semana
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {itemTurma.concluida ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3" />
                            Grade Completa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <AlertCircle className="h-3 w-3" />
                            Faltam {itemTurma.vagasRestantes} aulas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra de Progresso Semanal */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          itemTurma.concluida ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${perc}%` }}
                      />
                    </div>

                    {/* Grade de Matérias da Turma */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {disciplinasExibidas.length === 0 ? (
                        <div className="col-span-full py-2 text-center text-[11px] text-muted-foreground">
                          Nenhuma aula alocada nesta turma ainda.
                        </div>
                      ) : (
                        disciplinasExibidas.map((disc) => (
                          <div
                            key={disc.disciplina}
                            className="p-2 rounded-xl bg-muted/30 border border-border/70 text-xs flex flex-col justify-between gap-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-black text-foreground truncate" title={disc.disciplina}>
                                {disc.disciplina}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-black text-[10px] shrink-0">
                                {disc.aulas}h
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate" title={Array.from(disc.professores).join(', ')}>
                              {Array.from(disc.professores).join(', ') || 'Sem professor'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })
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
