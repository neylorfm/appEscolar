import { useState, useCallback, useEffect, useRef } from "react"
import { 
  GradeHorarioItem, 
  salvarCelulaGrade, 
  limparCelulaGrade,
  normalizarNomeTurma
} from "@/services/gradeHorarios"
import { toast } from "sonner"

export type AcaoHistorico = 
  | {
      tipo: "SET_CELULA"
      descricao: string
      anterior: GradeHorarioItem | null
      novo: GradeHorarioItem
    }
  | {
      tipo: "CLEAR_CELULA"
      descricao: string
      anterior: GradeHorarioItem
      segmento: string
      dia: string
      aula: number
      turma: string
    }
  | {
      tipo: "SWAP_CELULAS"
      descricao: string
      celulaA: { anterior: GradeHorarioItem; novo: GradeHorarioItem }
      celulaB: { anterior: GradeHorarioItem; novo: GradeHorarioItem }
    }

interface UseGradeHistoryProps {
  instancia: "PUBLICADA" | "RASCUNHO"
  canEdit: boolean
  setItensGrade: React.Dispatch<React.SetStateAction<GradeHorarioItem[]>>
}

export function useGradeHistory({ instancia, canEdit, setItensGrade }: UseGradeHistoryProps) {
  const [undoStack, setUndoStack] = useState<AcaoHistorico[]>([])
  const [redoStack, setRedoStack] = useState<AcaoHistorico[]>([])
  const isExecutingRef = useRef(false)

  // Limpa o histórico ao trocar de instância
  useEffect(() => {
    setUndoStack([])
    setRedoStack([])
  }, [instancia])

  const registrarAcao = useCallback((acao: AcaoHistorico) => {
    if (instancia !== "RASCUNHO" || !canEdit) return
    setUndoStack(prev => [...prev.slice(-29), acao]) // Mantém até 30 ações
    setRedoStack([]) // Limpa redo após nova ação manual
  }, [instancia, canEdit])

  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isExecutingRef.current || instancia !== "RASCUNHO" || !canEdit) return

    const acao = undoStack[undoStack.length - 1]
    isExecutingRef.current = true

    try {
      if (acao.tipo === "SET_CELULA") {
        if (acao.anterior) {
          // Restaura o item anterior
          await salvarCelulaGrade(acao.anterior)
          setItensGrade(prev => {
            const semNovo = prev.filter(i => !(
              i.segmento === acao.novo.segmento &&
              i.dia_semana === acao.novo.dia_semana &&
              i.numero_aula === acao.novo.numero_aula &&
              normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.novo.turma_nome)
            ))
            return [...semNovo, acao.anterior!]
          })
        } else {
          // A célula era vazia antes, logo esvazia
          await limparCelulaGrade(
            acao.novo.segmento,
            acao.novo.dia_semana,
            acao.novo.numero_aula,
            acao.novo.turma_nome,
            "RASCUNHO"
          )
          setItensGrade(prev => prev.filter(i => !(
            i.segmento === acao.novo.segmento &&
            i.dia_semana === acao.novo.dia_semana &&
            i.numero_aula === acao.novo.numero_aula &&
            normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.novo.turma_nome)
          )))
        }
      } else if (acao.tipo === "CLEAR_CELULA") {
        // Restaura a aula que havia sido limpa
        await salvarCelulaGrade(acao.anterior)
        setItensGrade(prev => {
          const semAtual = prev.filter(i => !(
            i.segmento === acao.segmento &&
            i.dia_semana === acao.dia &&
            i.numero_aula === acao.aula &&
            normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.turma)
          ))
          return [...semAtual, acao.anterior]
        })
      } else if (acao.tipo === "SWAP_CELULAS") {
        // Restaura os dois itens originais do Swap
        await Promise.all([
          salvarCelulaGrade(acao.celulaA.anterior),
          salvarCelulaGrade(acao.celulaB.anterior)
        ])
        setItensGrade(prev => {
          const limpo = prev.filter(i => {
            const isA = i.dia_semana === acao.celulaA.anterior.dia_semana &&
                        i.numero_aula === acao.celulaA.anterior.numero_aula &&
                        normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.celulaA.anterior.turma_nome)
            const isB = i.dia_semana === acao.celulaB.anterior.dia_semana &&
                        i.numero_aula === acao.celulaB.anterior.numero_aula &&
                        normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.celulaB.anterior.turma_nome)
            return !isA && !isB
          })
          return [...limpo, acao.celulaA.anterior, acao.celulaB.anterior]
        })
      }

      setUndoStack(prev => prev.slice(0, -1))
      setRedoStack(prev => [...prev, acao])
      toast.info(`Desfeito: ${acao.descricao}`, { icon: "↩️", duration: 1800 })
    } catch (err) {
      console.error("Erro ao desfazer ação:", err)
      toast.error("Não foi possível desfazer a última ação")
    } finally {
      isExecutingRef.current = false
    }
  }, [undoStack, instancia, canEdit, setItensGrade])

  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isExecutingRef.current || instancia !== "RASCUNHO" || !canEdit) return

    const acao = redoStack[redoStack.length - 1]
    isExecutingRef.current = true

    try {
      if (acao.tipo === "SET_CELULA") {
        await salvarCelulaGrade(acao.novo)
        setItensGrade(prev => {
          const semVelho = prev.filter(i => !(
            i.segmento === acao.novo.segmento &&
            i.dia_semana === acao.novo.dia_semana &&
            i.numero_aula === acao.novo.numero_aula &&
            normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.novo.turma_nome)
          ))
          return [...semVelho, acao.novo]
        })
      } else if (acao.tipo === "CLEAR_CELULA") {
        await limparCelulaGrade(
          acao.segmento,
          acao.dia,
          acao.aula,
          acao.turma,
          "RASCUNHO"
        )
        setItensGrade(prev => prev.filter(i => !(
          i.segmento === acao.segmento &&
          i.dia_semana === acao.dia &&
          i.numero_aula === acao.aula &&
          normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.turma)
        )))
      } else if (acao.tipo === "SWAP_CELULAS") {
        await Promise.all([
          salvarCelulaGrade(acao.celulaA.novo),
          salvarCelulaGrade(acao.celulaB.novo)
        ])
        setItensGrade(prev => {
          const limpo = prev.filter(i => {
            const isA = i.dia_semana === acao.celulaA.novo.dia_semana &&
                        i.numero_aula === acao.celulaA.novo.numero_aula &&
                        normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.celulaA.novo.turma_nome)
            const isB = i.dia_semana === acao.celulaB.novo.dia_semana &&
                        i.numero_aula === acao.celulaB.novo.numero_aula &&
                        normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(acao.celulaB.novo.turma_nome)
            return !isA && !isB
          })
          return [...limpo, acao.celulaA.novo, acao.celulaB.novo]
        })
      }

      setRedoStack(prev => prev.slice(0, -1))
      setUndoStack(prev => [...prev, acao])
      toast.info(`Refeito: ${acao.descricao}`, { icon: "↪️", duration: 1800 })
    } catch (err) {
      console.error("Erro ao refazer ação:", err)
      toast.error("Não foi possível refazer a ação")
    } finally {
      isExecutingRef.current = false
    }
  }, [redoStack, instancia, canEdit, setItensGrade])

  // Listener de Teclado Global: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    if (instancia !== "RASCUNHO" || !canEdit) return

    function handleKeyDown(e: KeyboardEvent) {
      // Ignora se estiver digitando em campo de texto
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, instancia, canEdit])

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    registrarAcao,
    undo,
    redo
  }
}
