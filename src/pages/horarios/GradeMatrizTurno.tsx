import { useState, useMemo } from "react"
import { 
  DIAS_SEMANA, 
  NOMES_DIAS, 
  GradeHorarioItem, 
  obterCorEfetivaProfessor, 
  getEstiloBadgeCor,
  normalizarNomeTurma
} from "@/services/gradeHorarios"
import { CelulaEditorPopover } from "./CelulaEditorPopover"
import { Disciplina } from "@/services/disciplinas"
import { AlertTriangle, Plus, Target } from "lucide-react"

interface GradeMatrizTurnoProps {
  segmento: string
  turmas: string[]
  aulas: { numero: number; rotulo: string }[]
  itensGrade: GradeHorarioItem[]
  conflitosSet: Set<string>
  conflitosMap: Map<string, string[]>
  disciplinasDisponiveis: Disciplina[]
  professoresCadastrados: string[]
  canEdit: boolean
  professorFiltro?: string
  turmaFiltro?: string
  onSalvarCelula: (
    segmento: string,
    dia: string,
    aula: number,
    turma: string,
    disciplina: string,
    professor: string,
    cor?: string
  ) => Promise<void>
  onLimparCelula: (
    segmento: string,
    dia: string,
    aula: number,
    turma: string
  ) => Promise<void>
}

export function GradeMatrizTurno({
  segmento,
  turmas,
  aulas,
  itensGrade,
  conflitosSet,
  conflitosMap,
  disciplinasDisponiveis,
  professoresCadastrados = [],
  canEdit,
  professorFiltro,
  turmaFiltro,
  onSalvarCelula,
  onLimparCelula
}: GradeMatrizTurnoProps) {
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null)

  // Mapa de cores ativas por professor
  const mapaCoresProfessores = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const item of itensGrade) {
      if (item.professor_nome && item.cor_destaque) {
        mapa.set(item.professor_nome.toUpperCase().trim(), item.cor_destaque)
      }
    }
    return mapa
  }, [itensGrade])

  // Mapa de itens para acesso O(1): com chave literal e chave normalizada
  const mapaItens = useMemo(() => {
    const mapa = new Map<string, GradeHorarioItem>()
    for (const item of itensGrade) {
      mapa.set(`${item.dia_semana}_${item.numero_aula}_${item.turma_nome}`, item)
      mapa.set(`${item.dia_semana}_${item.numero_aula}_${normalizarNomeTurma(item.turma_nome)}`, item)
    }
    return mapa
  }, [itensGrade])

  const turmasFiltradas = useMemo(() => {
    if (!turmaFiltro || turmaFiltro === "TODAS") return turmas
    return turmas.filter(t => t === turmaFiltro)
  }, [turmas, turmaFiltro])

  return (
    <div className="w-full overflow-hidden rounded-xl border-2 border-black dark:border-slate-600 bg-white dark:bg-slate-950 shadow-md">
      <div className="overflow-auto max-h-[calc(100vh-210px)] sm:max-h-[calc(100vh-190px)]">
        <table className="w-full border-collapse text-left border-spacing-0 table-fixed">
          <thead className="sticky top-0 z-30">
            {/* Linha de Cabeçalho das Turmas (Congelada no Topo) */}
            <tr className="bg-slate-100 dark:bg-slate-900 border-b-2 border-black dark:border-slate-600">
              {/* Coluna Dia no início (Congelada no Topo e na Esquerda) */}
              <th className="sticky top-0 left-0 z-40 bg-slate-100 dark:bg-slate-900 px-2 py-1 text-center font-black text-[11px] tracking-wider uppercase border-r-2 border-b-2 border-black dark:border-slate-600 w-12 select-none shadow-xs">
                DIA
              </th>
              {/* Coluna Aulas (Congelada no Topo e na Esquerda) */}
              <th className="sticky top-0 left-12 z-40 bg-slate-100 dark:bg-slate-900 px-1 py-1 text-center font-black text-[10px] tracking-wider uppercase border-r-2 border-b-2 border-black dark:border-slate-600 w-16 sm:w-20 select-none shadow-xs">
                AULAS
              </th>
              {/* Colunas das Turmas (Congeladas no Topo) */}
              {turmasFiltradas.map((turma) => (
                <th
                  key={turma}
                  className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 px-1 py-1 text-center font-black text-xs sm:text-[13px] tracking-wider uppercase border-r border-b-2 border-black dark:border-slate-600 min-w-[85px] sm:min-w-[98px] shadow-xs"
                >
                  <span className="inline-block px-1.5 py-0.5 rounded font-black text-slate-900 dark:text-slate-100">
                    {turma}
                  </span>
                </th>
              ))}
              {/* Coluna Dia no final (Congelada no Topo) */}
              <th className="sticky top-0 z-30 px-2 py-1 text-center font-black text-[11px] tracking-wider uppercase border-l-2 border-b-2 border-black dark:border-slate-600 w-12 hidden lg:table-cell bg-slate-100 dark:bg-slate-900 shadow-xs">
                DIA
              </th>
            </tr>
          </thead>

          <tbody>
            {DIAS_SEMANA.map((dia) => {
              const diaNome = NOMES_DIAS[dia]

              return aulas.map((aula, aulaIdx) => {
                const isPrimeiraAulaDia = aulaIdx === 0
                const isUltimaAulaDia = aulaIdx === aulas.length - 1

                return (
                  <tr
                    key={`${dia}_${aula.numero}`}
                    className={`hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors ${
                      isUltimaAulaDia ? "border-b-2 border-black dark:border-slate-600" : "border-b border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {/* Célula do Dia da Semana (RowSpan para agrupar todas as aulas do dia - Tipografia Forte como no Word) */}
                    {isPrimeiraAulaDia && (
                      <td
                        rowSpan={aulas.length}
                        className="sticky left-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs font-black text-center text-base sm:text-lg tracking-tighter text-black dark:text-white border-r-2 border-black dark:border-slate-600 py-1 px-1 select-none align-middle"
                        style={{ fontFamily: "Impact, Arial Black, sans-serif" }}
                      >
                        <div className="font-black leading-tight tracking-wider transform -rotate-90 sm:rotate-0">
                          {dia}
                        </div>
                      </td>
                    )}

                    {/* Célula do Número da Aula (Compacta) */}
                    <td className="sticky left-12 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs font-black text-center text-[9.5px] text-slate-800 dark:text-slate-200 border-r-2 border-black dark:border-slate-600 px-1 py-1 whitespace-nowrap">
                      {aula.numero}ª AULA
                    </td>

                    {/* Células de Cada Turma */}
                    {turmasFiltradas.map((turma) => {
                      const chave = `${dia}_${aula.numero}_${turma}`
                      const chaveNorm = `${dia}_${aula.numero}_${normalizarNomeTurma(turma)}`
                      const item = mapaItens.get(chaveNorm) || mapaItens.get(chave)

                      // Segmento real para salvar (se estiver na visão integral completo, define se é manhã ou tarde)
                      const segmentoReal =
                        segmento === "INTEGRAL_COMPLETO"
                          ? aula.numero <= 5
                            ? "INTEGRAL_MANHA"
                            : "INTEGRAL_TARDE"
                          : segmento

                      const chaveConflito = `${segmentoReal}_${dia}_${aula.numero}_${turma}`
                      const chaveConflitoNorm = `${segmentoReal}_${dia}_${aula.numero}_${normalizarNomeTurma(turma)}`
                      const temConflito = Boolean(item) && (conflitosSet.has(chaveConflito) || conflitosSet.has(chaveConflitoNorm))

                      const prof = item?.professor_nome || ""
                      const chaveProfGlobal = `${dia}_${aula.numero}_${prof}`
                      const turmasConflito = conflitosMap.get(chaveProfGlobal)
                      const conflitoInfo = turmasConflito
                        ? `⚠️ CHOQUE DE HORÁRIO: O professor(a) "${prof}" está alocado simultaneamente em 2 ou mais turmas neste mesmo horário (${turmasConflito.join(", ")}).`
                        : undefined

                      // Função para busca insensível a maiúsculas/minúsculas e acentuação (ex: simoes encontra SIMÕES)
                      const normalizarTextoBusca = (txt: string) =>
                        txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()

                      // Destaque para filtro de professor
                      const profMatch = Boolean(
                        professorFiltro &&
                        professorFiltro.trim().length > 0 &&
                        prof &&
                        normalizarTextoBusca(prof).includes(normalizarTextoBusca(professorFiltro))
                      )

                      // Cor exclusiva do professor (personalizada ou padrão estável da paleta de 50)
                      const corDoProfessor = prof
                        ? obterCorEfetivaProfessor(prof, item?.cor_destaque, mapaCoresProfessores)
                        : ""
                      const estiloProfessor = corDoProfessor ? getEstiloBadgeCor(corDoProfessor) : undefined
                      // Identifica se há filtro ativo digitado
                      const temFiltroAtivo = Boolean(professorFiltro && professorFiltro.trim().length > 0)

                      return (
                        <td
                          key={turma}
                          className={`p-0 border-r border-slate-300 dark:border-slate-700 text-center align-middle transition-all ${
                            isDragTarget
                              ? "ring-2 ring-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 z-10"
                              : ""
                          }`}
                          onDragOver={(e) => {
                            if (!canEdit) return
                            e.preventDefault()
                            const copyMode = e.ctrlKey || e.altKey
                            e.dataTransfer.dropEffect = copyMode ? "copy" : "move"
                            setDragOverCellKey(chave)
                          }}
                          onDragLeave={() => {
                            if (dragOverCellKey === chave) {
                              setDragOverCellKey(null)
                            }
                          }}
                          onDrop={async (e) => {
                            if (!canEdit) return
                            e.preventDefault()
                            setDragOverCellKey(null)

                            try {
                              const rawData = e.dataTransfer.getData("application/json")
                              if (!rawData) return
                              const data = JSON.parse(rawData)

                              const copyMode = e.ctrlKey || e.altKey || data.forceCopy
                              const { segmentoOrigem, diaOrigem, aulaOrigem, turmaOrigem, disciplina, professor, cor } = data

                              if (!disciplina || !professor) return

                              const isMesmaCelula =
                                segmentoOrigem === segmentoReal &&
                                diaOrigem === dia &&
                                aulaOrigem === aula.numero &&
                                turmaOrigem === turma

                              if (isMesmaCelula) return

                              // 1. Salva na célula destino
                              await onSalvarCelula(segmentoReal, dia, aula.numero, turma, disciplina, professor, cor)

                              // 2. Se for MOVER (sem Ctrl/Alt), esvazia a origem
                              if (!copyMode) {
                                await onLimparCelula(segmentoOrigem, diaOrigem, aulaOrigem, turmaOrigem)
                              }
                            } catch (err) {
                              console.error("Erro no drag and drop:", err)
                            }
                          }}
                        >
                          <CelulaEditorPopover
                            turmaNome={turma}
                            diaSemana={dia}
                            diaNome={diaNome}
                            numeroAula={aula.numero}
                            aulaRotulo={aula.rotulo}
                            disciplinaAtual={item?.disciplina_nome || ""}
                            professorAtual={item?.professor_nome || ""}
                            corAtual={corDoProfessor}
                            mapaCoresProfessores={mapaCoresProfessores}
                            disciplinasDisponiveis={disciplinasDisponiveis}
                            professoresCadastrados={professoresCadastrados}
                            temConflito={temConflito}
                            conflitoInfo={conflitoInfo}
                            canEdit={canEdit}
                            onSalvar={async (disc, prof, cor) => {
                              await onSalvarCelula(segmentoReal, dia, aula.numero, turma, disc, prof, cor)
                            }}
                            onLimpar={async () => {
                              await onLimparCelula(segmentoReal, dia, aula.numero, turma)
                            }}
                          >
                            <div
                              draggable={canEdit && Boolean(item)}
                              onDragStart={(e) => {
                                if (!canEdit || !item) return
                                const copyMode = e.ctrlKey || e.altKey
                                e.dataTransfer.effectAllowed = "copyMove"
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({
                                    segmentoOrigem: segmentoReal,
                                    diaOrigem: dia,
                                    aulaOrigem: aula.numero,
                                    turmaOrigem: turma,
                                    disciplina: item.disciplina_nome,
                                    professor: item.professor_nome,
                                    cor: corDoProfessor,
                                    forceCopy: copyMode
                                  })
                                )
                              }}
                              role="button"
                              tabIndex={canEdit ? 0 : -1}
                              title={
                                temConflito
                                  ? conflitoInfo
                                  : item
                                  ? `${item.disciplina_nome} - Prof. ${item.professor_nome} (Arraste para mover • Segure Ctrl e arraste para duplicar)`
                                  : canEdit
                                  ? "Clique para definir aula ou solte um horário aqui"
                                  : ""
                              }
                              style={temConflito ? undefined : (item ? estiloProfessor : undefined)}
                              className={`group relative w-full h-[28px] sm:h-[30px] lg:h-[32px] px-0.5 py-0.5 flex flex-col justify-center items-center text-center overflow-hidden transition-all select-none ${
                                temConflito
                                  ? "animacao-conflito-alerta font-black cursor-pointer"
                                  : item
                                  ? `border-b border-black/10 dark:border-white/10 ${
                                      canEdit ? "cursor-grab active:cursor-grabbing" : ""
                                    }`
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
                              } ${
                                canEdit && !temConflito ? "hover:brightness-95 active:scale-[0.98]" : ""
                              } ${
                                profMatch && !temConflito
                                  ? "ring-2 ring-red-600 bg-red-100 dark:bg-red-950/80 text-red-950 dark:text-red-100 font-black shadow-md relative z-20 scale-[1.02]"
                                  : temFiltroAtivo && item && !temConflito
                                  ? "opacity-35 grayscale-[60%] transition-opacity"
                                  : ""
                              }`}
                            >
                              {/* Ícone de Target (Alvo) quando a célula corresponder à busca do professor */}
                              {profMatch && !temConflito && (
                                <div 
                                  className="absolute top-0 right-0 z-20 flex items-center justify-center p-0.5 rounded-bl-md bg-red-600 text-white shadow-xs animate-pulse pointer-events-none"
                                  title={`Correspondência encontrada: Prof. ${item?.professor_nome}`}
                                >
                                  <Target className="h-3 w-3 stroke-[2.8]" />
                                </div>
                              )}

                              {item ? (
                                <>
                                  {temConflito ? (
                                    <div className="flex flex-col items-center justify-center w-full leading-none">
                                      <div className="flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-black uppercase tracking-tight">
                                        <AlertTriangle className="h-2.5 w-2.5 fill-white text-red-700 animate-bounce shrink-0" />
                                        <span>CONFLITO!</span>
                                      </div>
                                      <span className="font-extrabold text-[8px] sm:text-[8.5px] truncate w-full">
                                        {item.professor_nome}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Nome da Disciplina */}
                                      <span className="font-black text-[9px] sm:text-[9.5px] leading-tight truncate w-full tracking-tighter">
                                        {item.disciplina_nome}
                                      </span>
                                      {/* Nome do Professor com Ícone de Target se pesquisado */}
                                      <span className="font-bold text-[8px] sm:text-[8.5px] leading-tight truncate w-full flex items-center justify-center gap-0.5 opacity-90">
                                        {profMatch && (
                                          <Target className="h-2.5 w-2.5 text-red-600 shrink-0 inline stroke-[2.5]" />
                                        )}
                                        <span className="truncate">{item.professor_nome}</span>
                                      </span>
                                    </>
                                  )}
                                </>
                              ) : canEdit ? (
                                <div className="opacity-20 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Plus className="h-3 w-3 text-muted-foreground" />
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/30">-</span>
                              )}
                            </div>
                          </CelulaEditorPopover>
                        </td>
                      )
                    })}

                    {/* Coluna Dia no final (apenas na 1ª aula do dia - Idêntica ao Word) */}
                    {isPrimeiraAulaDia && (
                      <td
                        rowSpan={aulas.length}
                        className="hidden lg:table-cell font-black text-center text-base sm:text-lg tracking-tighter text-black dark:text-white border-l-2 border-black dark:border-slate-600 py-1 px-1 select-none align-middle bg-slate-100/95 dark:bg-slate-900/95"
                        style={{ fontFamily: "Impact, Arial Black, sans-serif" }}
                      >
                        <div className="font-black leading-tight tracking-wider">
                          {dia}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
