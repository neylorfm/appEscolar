import { useMemo } from "react"
import { DIAS_SEMANA, NOMES_DIAS, GradeHorarioItem, getEstiloBadgeCor, obterCorEfetivaProfessor } from "@/services/gradeHorarios"
import { Input } from "@/components/ui/input"
import { CalendarDays, Clock, User, Search, X } from "lucide-react"

interface MinhasAulasViewProps {
  itensGrade: GradeHorarioItem[]
  professorSelecionado: string
  professoresCadastrados: string[]
  isCoordinatorOrAdmin: boolean
  onSelecionarProfessor: (nome: string) => void
}

export function MinhasAulasView({
  itensGrade,
  professorSelecionado,
  professoresCadastrados = [],
  isCoordinatorOrAdmin,
  onSelecionarProfessor
}: MinhasAulasViewProps) {
  // Filtra itens pelo professor selecionado com normalização de acentos
  const aulasDoProfessor = useMemo(() => {
    if (!professorSelecionado.trim()) return []
    const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()
    const busca = normalizar(professorSelecionado)
    return itensGrade.filter(i => {
      if (!i.professor_nome) return false
      const profNorm = normalizar(i.professor_nome)
      return profNorm === busca || profNorm.includes(busca)
    })
  }, [itensGrade, professorSelecionado])

  // Agrupa aulas por dia da semana
  const aulasPorDia = useMemo(() => {
    const mapa: Record<string, GradeHorarioItem[]> = {
      SEG: [],
      TER: [],
      QUA: [],
      QUI: [],
      SEX: []
    }

    for (const aula of aulasDoProfessor) {
      if (mapa[aula.dia_semana]) {
        mapa[aula.dia_semana].push(aula)
      }
    }

    // Ordena por número de aula
    for (const dia of DIAS_SEMANA) {
      mapa[dia].sort((a, b) => a.numero_aula - b.numero_aula)
    }

    return mapa
  }, [aulasDoProfessor])

  // Lista de nomes únicos de professores presentes na grade
  const listaProfessores = useMemo(() => {
    const nomesSet = new Set<string>()
    for (const p of professoresCadastrados) {
      if (p.trim()) nomesSet.add(p.trim().toUpperCase())
    }
    for (const item of itensGrade) {
      if (item.professor_nome?.trim()) {
        nomesSet.add(item.professor_nome.trim().toUpperCase())
      }
    }
    return Array.from(nomesSet).sort((a, b) => a.localeCompare(b))
  }, [professoresCadastrados, itensGrade])

  const totalAulasSemana = aulasDoProfessor.length
  const corProfessor = obterCorEfetivaProfessor(professorSelecionado)
  const estiloBadge = getEstiloBadgeCor(corProfessor)

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho do Filtro / Seletor de Professor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3">
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center font-black"
            style={estiloBadge}
          >
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              Agenda do Professor: 
              <span 
                className="px-2.5 py-0.5 rounded-lg border font-black text-sm sm:text-base shadow-2xs"
                style={estiloBadge}
              >
                {professorSelecionado || "Selecione"}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Total de aulas alocadas na semana: <strong className="text-foreground">{totalAulasSemana} aulas</strong>
            </p>
          </div>
        </div>

        {/* Campo de Busca com Digitação Direta e Sugestões para Coordenadores/Admin */}
        {isCoordinatorOrAdmin && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden sm:inline">
              Buscar Professor:
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Digite o nome..."
                value={professorSelecionado}
                onChange={(e) => onSelecionarProfessor(e.target.value)}
                list="lista-professores-minhas-aulas"
                className="pl-8.5 pr-7 h-9 text-xs font-bold uppercase"
              />
              {professorSelecionado && (
                <button
                  type="button"
                  onClick={() => onSelecionarProfessor("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Limpar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <datalist id="lista-professores-minhas-aulas">
                {listaProfessores.map((profNome) => (
                  <option key={profNome} value={profNome} />
                ))}
              </datalist>
            </div>
          </div>
        )}
      </div>

      {/* Grade Semanal de Aulas do Professor (Cards de Segunda a Sexta) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {DIAS_SEMANA.map((dia) => {
          const aulas = aulasPorDia[dia] || []
          const diaNome = NOMES_DIAS[dia]

          return (
            <div
              key={dia}
              className="flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all"
            >
              {/* Topo do Card do Dia */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/50 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-black text-xs text-foreground uppercase tracking-wider">
                    {diaNome}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/60">
                  {aulas.length} aula{aulas.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Lista de Aulas do Dia */}
              <div className="p-2.5 flex flex-col gap-2 flex-1 min-h-[160px]">
                {aulas.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl">
                    <span className="text-xs text-muted-foreground font-medium">
                      Sem aulas agendadas
                    </span>
                  </div>
                ) : (
                  aulas.map((item) => (
                    <div
                      key={`${item.segmento}_${item.dia_semana}_${item.numero_aula}_${item.turma_nome}`}
                      className="flex flex-col gap-1 p-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/30 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-primary text-[11px]">
                          <Clock className="h-3 w-3" />
                          {item.numero_aula}ª Aula
                        </span>
                        <span className="font-black text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60 uppercase">
                          {item.turma_nome}
                        </span>
                      </div>

                      <div className="pt-0.5">
                        <span className="font-extrabold text-xs text-foreground block truncate">
                          {item.disciplina_nome}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
