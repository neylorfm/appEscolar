import { useState, useMemo, useEffect, useCallback } from "react"
import { 
  DIAS_SEMANA, 
  NOMES_DIAS, 
  GradeHorarioItem, 
  obterCorEfetivaProfessor, 
  getEstiloBadgeCor,
  normalizarNomeTurma,
  TamanhoFonteRascunho,
  OPCOES_TAMANHO_FONTE_RASCUNHO
} from "@/services/gradeHorarios"
import { CelulaEditorPopover } from "./CelulaEditorPopover"
import { Disciplina } from "@/services/disciplinas"
import { AlertTriangle, Plus, Target, Ban } from "lucide-react"
import { toast } from "sonner"

export interface DadosTrocaCelulas {
  segmentoA: string
  diaA: string
  aulaA: number
  turmaA: string
  disciplinaA: string
  professorA: string
  corA?: string
  segmentoB: string
  diaB: string
  aulaB: number
  turmaB: string
  disciplinaB: string
  professorB: string
  corB?: string
}

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
  turmasCustomizadas?: string[]
  diasFiltro?: string[]
  tamanhoFonte?: TamanhoFonteRascunho
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
  onTrocarCelulas?: (dados: DadosTrocaCelulas) => Promise<void>
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
  turmasCustomizadas,
  diasFiltro,
  tamanhoFonte = "padrao",
  onSalvarCelula,
  onLimparCelula,
  onTrocarCelulas
}: GradeMatrizTurnoProps) {
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null)
  
  // Raio-X de Disponibilidade Docente (Ghost Highlighting - Fase 2)
  const [draggedTeacher, setDraggedTeacher] = useState<string | null>(null)
  const [draggedOriginKey, setDraggedOriginKey] = useState<string | null>(null)

  // Foco de Célula e Controle de Abertura de Modal (Fase 2)
  const [focusedCell, setFocusedCell] = useState<{ dia: string; aula: number; turma: string } | null>(null)
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null)
  const [clipboardGrade, setClipboardGrade] = useState<{
    disciplina_nome: string
    professor_nome: string
    cor_destaque?: string
  } | null>(null)

  // Configuração visual de tamanho de fonte para a grade
  const configFonte = useMemo(() => {
    return (
      OPCOES_TAMANHO_FONTE_RASCUNHO.find((opt) => opt.id === tamanhoFonte) ||
      OPCOES_TAMANHO_FONTE_RASCUNHO[0]
    )
  }, [tamanhoFonte])

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

  // Dias da semana visíveis conforme filtro
  const diasParaRenderizar = useMemo(() => {
    if (!diasFiltro || diasFiltro.length === 0) return DIAS_SEMANA
    return DIAS_SEMANA.filter(d => diasFiltro.includes(d))
  }, [diasFiltro])

  // Filtragem flexível de turmas
  const turmasFiltradas = useMemo(() => {
    if (turmaFiltro === "CUSTOM" && turmasCustomizadas && turmasCustomizadas.length > 0) {
      return turmas.filter(t => turmasCustomizadas.includes(t))
    }
    if (turmaFiltro === "SERIE_1") {
      return turmas.filter(t => t.startsWith("1º") || t.startsWith("1ª") || t.includes("1"))
    }
    if (turmaFiltro === "SERIE_2") {
      return turmas.filter(t => t.startsWith("2º") || t.startsWith("2ª") || t.includes("2"))
    }
    if (turmaFiltro === "SERIE_3") {
      return turmas.filter(t => t.startsWith("3º") || t.startsWith("3ª") || t.includes("3"))
    }
    if (!turmaFiltro || turmaFiltro === "TODAS") return turmas
    return turmas.filter(t => t === turmaFiltro)
  }, [turmas, turmaFiltro, turmasCustomizadas])

  // Largura dinâmica responsiva das colunas de turma para melhor conforto visual
  const classeLarguraColuna = useMemo(() => {
    if (turmasFiltradas.length <= 3) return "min-w-[140px] sm:min-w-[180px]"
    if (turmasFiltradas.length <= 5) return "min-w-[110px] sm:min-w-[135px]"
    return "min-w-[85px] sm:min-w-[98px]"
  }, [turmasFiltradas.length])

  // Função auxiliar para normalização de busca de texto
  const normalizarTextoBusca = useCallback((txt: string) =>
    txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim(), [])

  // Gerenciador de Atalhos de Teclado Power-User (Fase 2)
  useEffect(() => {
    if (!canEdit) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }

      if (!focusedCell) return

      const diaIdx = diasParaRenderizar.indexOf(focusedCell.dia as any)
      const aulaIdx = aulas.findIndex(a => a.numero === focusedCell.aula)
      const turmaIdx = turmasFiltradas.indexOf(focusedCell.turma)

      // Navegação por Setas
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (turmaIdx > 0) {
          setFocusedCell({ ...focusedCell, turma: turmasFiltradas[turmaIdx - 1] })
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        if (turmaIdx < turmasFiltradas.length - 1) {
          setFocusedCell({ ...focusedCell, turma: turmasFiltradas[turmaIdx + 1] })
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        if (aulaIdx > 0) {
          setFocusedCell({ ...focusedCell, aula: aulas[aulaIdx - 1].numero })
        } else if (diaIdx > 0) {
          setFocusedCell({
            dia: diasParaRenderizar[diaIdx - 1],
            aula: aulas[aulas.length - 1].numero,
            turma: focusedCell.turma
          })
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        if (aulaIdx < aulas.length - 1) {
          setFocusedCell({ ...focusedCell, aula: aulas[aulaIdx + 1].numero })
        } else if (diaIdx < diasParaRenderizar.length - 1) {
          setFocusedCell({
            dia: diasParaRenderizar[diaIdx + 1],
            aula: aulas[0].numero,
            turma: focusedCell.turma
          })
        }
      }

      // Tecla Enter ou Espaço: Abrir Edição da Célula Focada
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        const chave = `${focusedCell.dia}_${focusedCell.aula}_${focusedCell.turma}`
        setEditingCellKey(chave)
      }

      // Tecla Delete / Backspace: Limpar Horário
      if (e.key === "Delete" || e.key === "Backspace") {
        const chave = `${focusedCell.dia}_${focusedCell.aula}_${focusedCell.turma}`
        const chaveNorm = `${focusedCell.dia}_${focusedCell.aula}_${normalizarNomeTurma(focusedCell.turma)}`
        const item = mapaItens.get(chaveNorm) || mapaItens.get(chave)
        if (item) {
          e.preventDefault()
          const seg = segmento === "INTEGRAL_COMPLETO"
            ? focusedCell.aula <= 5 ? "INTEGRAL_MANHA" : "INTEGRAL_TARDE"
            : segmento
          onLimparCelula(seg, focusedCell.dia, focusedCell.aula, focusedCell.turma)
        }
      }

      // Atalho Ctrl+C: Copiar Aula Selecionada
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const chave = `${focusedCell.dia}_${focusedCell.aula}_${focusedCell.turma}`
        const chaveNorm = `${focusedCell.dia}_${focusedCell.aula}_${normalizarNomeTurma(focusedCell.turma)}`
        const item = mapaItens.get(chaveNorm) || mapaItens.get(chave)
        if (item) {
          e.preventDefault()
          setClipboardGrade({
            disciplina_nome: item.disciplina_nome,
            professor_nome: item.professor_nome,
            cor_destaque: item.cor_destaque || undefined
          })
          toast.success(`Copiado: ${item.disciplina_nome} (${item.professor_nome})`, { icon: "📋", duration: 1500 })
        }
      }

      // Atalho Ctrl+V: Colar Aula na Célula Focada
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && clipboardGrade) {
        e.preventDefault()
        const seg = segmento === "INTEGRAL_COMPLETO"
          ? focusedCell.aula <= 5 ? "INTEGRAL_MANHA" : "INTEGRAL_TARDE"
          : segmento
        onSalvarCelula(
          seg,
          focusedCell.dia,
          focusedCell.aula,
          focusedCell.turma,
          clipboardGrade.disciplina_nome,
          clipboardGrade.professor_nome,
          clipboardGrade.cor_destaque
        )
        toast.success(`Colado em ${focusedCell.turma}: ${clipboardGrade.disciplina_nome}`, { icon: "📌", duration: 1500 })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canEdit, focusedCell, diasParaRenderizar, aulas, turmasFiltradas, mapaItens, segmento, onLimparCelula, onSalvarCelula, clipboardGrade])

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
                  className={`sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 px-1 py-1 text-center font-black text-xs sm:text-[13px] tracking-wider uppercase border-r border-b-2 border-black dark:border-slate-600 ${classeLarguraColuna} shadow-xs`}
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
            {diasParaRenderizar.map((dia) => {
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
                      const grupoTurnoReal = segmentoReal === "NOTURNO" ? "NOTURNO" : "INTEGRAL"
                      const chaveProfGlobal = `${grupoTurnoReal}_${dia}_${aula.numero}_${prof}`
                      const turmasConflito = conflitosMap.get(chaveProfGlobal)
                      const conflitoInfo = turmasConflito
                        ? `⚠️ CHOQUE DE HORÁRIO: O professor(a) "${prof}" está alocado simultaneamente em 2 ou mais turmas neste mesmo horário (${turmasConflito.join(", ")}).`
                        : undefined

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
                      const temFiltroAtivo = Boolean(professorFiltro && professorFiltro.trim().length > 0)
                      const isDragTarget = dragOverCellKey === chave

                      // Raio-X Docente: Cálculo em Tempo Real durante Arrasto (Fase 2)
                      const profArrastadoAtivo = Boolean(draggedTeacher && draggedTeacher.trim().length > 0)
                      const profArrastadoNorm = profArrastadoAtivo ? normalizarTextoBusca(draggedTeacher!) : ""
                      const isOrigemDoArrasto = draggedOriginKey === chave

                      // Verifica se o professor arrastado já está em outra turma no mesmo dia/aula e mesmo grupo de turno
                      const profArrastadoTemChoqueAqui = profArrastadoAtivo && !isOrigemDoArrasto && itensGrade.some(i =>
                        i.dia_semana === dia &&
                        i.numero_aula === aula.numero &&
                        (i.segmento === "NOTURNO" ? "NOTURNO" : "INTEGRAL") === grupoTurnoReal &&
                        normalizarNomeTurma(i.turma_nome) !== normalizarNomeTurma(turma) &&
                        i.professor_nome &&
                        normalizarTextoBusca(i.professor_nome) === profArrastadoNorm
                      )

                      const profArrastadoLivreAqui = profArrastadoAtivo && !isOrigemDoArrasto && !profArrastadoTemChoqueAqui

                      // Foco de Navegação por Teclado
                      const isFocused = Boolean(
                        focusedCell &&
                        focusedCell.dia === dia &&
                        focusedCell.aula === aula.numero &&
                        focusedCell.turma === turma
                      )

                      return (
                        <td
                          key={turma}
                          className={`p-0 border-r border-slate-300 dark:border-slate-700 text-center align-middle transition-all relative ${
                            isDragTarget
                              ? "ring-2 ring-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 z-10"
                              : profArrastadoTemChoqueAqui
                              ? "bg-red-100/80 dark:bg-red-950/60 ring-1 ring-red-500/50 opacity-45 cursor-not-allowed"
                              : profArrastadoLivreAqui
                              ? "bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500/40"
                              : ""
                          } ${
                            isFocused ? "ring-2 ring-blue-600 bg-blue-500/15 dark:ring-blue-400 dark:bg-blue-950/40 z-30 shadow-md scale-[1.01]" : ""
                          }`}
                          onClick={() => setFocusedCell({ dia, aula: aula.numero, turma })}
                          onDoubleClick={() => {
                            if (canEdit) setEditingCellKey(chave)
                          }}
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
                            setDraggedTeacher(null)
                            setDraggedOriginKey(null)

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

                              // SMART SWAP: Se a célula de destino já estiver ocupada e NÃO for cópia, inverte os dois horários!
                              if (item && !copyMode) {
                                if (onTrocarCelulas) {
                                  await onTrocarCelulas({
                                    segmentoA: segmentoReal,
                                    diaA: dia,
                                    aulaA: aula.numero,
                                    turmaA: turma,
                                    disciplinaA: disciplina,
                                    professorA: professor,
                                    corA: cor,
                                    segmentoB: segmentoOrigem,
                                    diaB: diaOrigem,
                                    aulaB: aulaOrigem,
                                    turmaB: turmaOrigem,
                                    disciplinaB: item.disciplina_nome,
                                    professorB: item.professor_nome,
                                    corB: item.cor_destaque || undefined
                                  })
                                } else {
                                  await onSalvarCelula(segmentoReal, dia, aula.numero, turma, disciplina, professor, cor)
                                  await onSalvarCelula(segmentoOrigem, diaOrigem, aulaOrigem, turmaOrigem, item.disciplina_nome, item.professor_nome, item.cor_destaque || undefined)
                                }
                              } else {
                                await onSalvarCelula(segmentoReal, dia, aula.numero, turma, disciplina, professor, cor)
                                if (!copyMode) {
                                  await onLimparCelula(segmentoOrigem, diaOrigem, aulaOrigem, turmaOrigem)
                                }
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
                            open={editingCellKey === chave}
                            onOpenChange={(isOpen) => setEditingCellKey(isOpen ? chave : null)}
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
                                setDraggedTeacher(item.professor_nome)
                                setDraggedOriginKey(chave)
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
                              onDragEnd={() => {
                                setDraggedTeacher(null)
                                setDraggedOriginKey(null)
                                setDragOverCellKey(null)
                              }}
                              role="button"
                              tabIndex={canEdit ? 0 : -1}
                              title={
                                temConflito
                                  ? conflitoInfo
                                  : profArrastadoTemChoqueAqui
                                  ? `⚠️ Choque: Prof. ${draggedTeacher} já tem aula neste horário em outra turma!`
                                  : profArrastadoLivreAqui
                                  ? `✓ Horário Livre para Prof. ${draggedTeacher}`
                                  : item
                                  ? `${item.disciplina_nome} - Prof. ${item.professor_nome} (Duplo clique ou Enter para editar • Ctrl+C / Ctrl+V • Del)`
                                  : canEdit
                                  ? "Duplo clique para definir aula ou use Setas + Ctrl+V"
                                  : ""
                              }
                              style={temConflito ? undefined : (item ? estiloProfessor : undefined)}
                              className={`group relative w-full ${configFonte.classeCelula} px-0.5 py-0.5 flex flex-col justify-center items-center text-center overflow-hidden transition-all select-none ${
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

                              {/* Raio-X Docente: Mini Badge visual de Choque durante o arrasto */}
                              {profArrastadoTemChoqueAqui && (
                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none z-20">
                                  <Ban className="h-3.5 w-3.5 text-red-600 dark:text-red-400 stroke-[3]" />
                                </div>
                              )}

                              {item ? (
                                <>
                                  {temConflito ? (
                                    <div className="flex flex-col items-center justify-center w-full leading-none">
                                      <div className={`flex items-center gap-0.5 ${configFonte.classeDisciplina} font-black uppercase tracking-tight`}>
                                        <AlertTriangle className="h-2.5 w-2.5 fill-white text-red-700 animate-bounce shrink-0" />
                                        <span>CONFLITO!</span>
                                      </div>
                                      <span className={`font-extrabold ${configFonte.classeProfessor} truncate w-full`}>
                                        {item.professor_nome}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Nome da Disciplina */}
                                      <span className={`font-black ${configFonte.classeDisciplina} leading-tight truncate w-full tracking-tighter`}>
                                        {item.disciplina_nome}
                                      </span>
                                      {/* Nome do Professor com Ícone de Target se pesquisado */}
                                      <span className={`font-bold ${configFonte.classeProfessor} leading-tight truncate w-full flex items-center justify-center gap-0.5 opacity-90`}>
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
                                <span className={`${configFonte.classeProfessor} text-muted-foreground/30`}>-</span>
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
