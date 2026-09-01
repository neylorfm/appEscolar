import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  getGradeHorarios, 
  salvarCelulaGrade, 
  limparCelulaGrade, 
  garantirDisciplina,
  detectarChoquesHorario,
  atualizarCorProfessorGlobal,
  formatarNomeCurtoTurma,
  normalizarNomeTurma,
  getVisibilidadeGradeHorarios,
  setVisibilidadeGradeHorarios,
  copiarInstanciaVisualizacaoParaEdicao,
  publicarInstanciaEdicao,
  getVigenciaGrade,
  salvarVigenciaGrade,
  InstanciaGrade,
  OPCOES_FONTES_GRADE,
  IdFonteGrade,
  getFonteGrade,
  salvarFonteGrade,
  getFontFamilyById,
  TamanhoFonteRascunho,
  OPCOES_TAMANHO_FONTE_RASCUNHO,
  getTamanhoFonteRascunho,
  salvarTamanhoFonteRascunho,
  TURMAS_INTEGRAL_PADRAO,
  TURMAS_NOTURNO_PADRAO,
  ESTRUTURA_AULAS,
  GradeHorarioItem,
  DIAS_SEMANA
} from "@/services/gradeHorarios"
import { getDisciplinas, Disciplina } from "@/services/disciplinas"
import { getTurmas, Turma } from "@/services/turmas"
import { GradeMatrizTurno, DadosTrocaCelulas } from "./GradeMatrizTurno"
import { MinhasAulasView } from "./MinhasAulasView"
import { ImpressaoHorariosModal } from "./ImpressaoHorariosModal"
import { ImpressaoGradeCompleta } from "./ImpressaoGradeCompleta"
import { PublicarHorariosModal } from "./PublicarHorariosModal"
import { SnapshotsGradeModal } from "./SnapshotsGradeModal"
import { MetasCurricularesModal } from "./MetasCurricularesModal"
import { RadarJanelasDocentesModal } from "./RadarJanelasDocentesModal"
import { useGradeHistory } from "@/hooks/useGradeHistory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { 
  CalendarRange, 
  Printer, 
  Search, 
  AlertTriangle, 
  Sparkles, 
  Sun, 
  Sunset, 
  Moon, 
  RefreshCw,
  Maximize2,
  Minimize2,
  Calendar,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Copy,
  UploadCloud,
  ArrowRight,
  Type,
  ChevronUp,
  ChevronDown,
  Clock,
  X,
  User,
  ZoomIn,
  Undo2,
  Redo2,
  Layers,
  CheckSquare,
  Camera,
  BookOpen,
  Radio
} from "lucide-react"

type AbaSegmento = "INTEGRAL_COMPLETO" | "MANHA" | "TARDE" | "NOTURNO" | "POR_PROFESSOR"

export default function QuadroHorariosPage() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.papel === "Administrador"
  const isCoordenador = usuario?.papel === "Coordenador"
  const canEdit = isAdmin || isCoordenador

  // Modo Sanfona / Contrair Controles
  const [painelContraido, setPainelContraido] = useState<boolean>(() => {
    try {
      return localStorage.getItem("grade_horarios_painel_contraido") === "true"
    } catch {
      return false
    }
  })

  function togglePainelContraido() {
    setPainelContraido(prev => {
      const novo = !prev
      try {
        localStorage.setItem("grade_horarios_painel_contraido", String(novo))
      } catch {}
      return novo
    })
  }

  // Controle de Instâncias (PUBLICADA vs RASCUNHO)
  const [instanciaAtiva, setInstanciaAtiva] = useState<InstanciaGrade>("PUBLICADA")
  const [copiandoVisualizacao, setCopiandoVisualizacao] = useState(false)
  const [dialogCopiarAberto, setDialogCopiarAberto] = useState(false)
  const [modalPublicarAberto, setModalPublicarAberto] = useState<boolean>(false)
  const [modalSnapshotsAberto, setModalSnapshotsAberto] = useState<boolean>(false)
  const [modalMetasAberto, setModalMetasAberto] = useState<boolean>(false)
  const [modalJanelasAberto, setModalJanelasAberto] = useState<boolean>(false)

  const [abaAtiva, setAbaAtiva] = useState<AbaSegmento>("MANHA")
  const [itensGrade, setItensGrade] = useState<GradeHorarioItem[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [turmasCadastradas, setTurmasCadastradas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [isTelaCheia, setIsTelaCheia] = useState(false)
  const [isGradePublicada, setIsGradePublicada] = useState(true)
  const [salvandoPublicacao, setSalvandoPublicacao] = useState(false)

  // Hook de Desfazer/Refazer (Undo/Redo - Fase 1)
  const { canUndo, canRedo, undo, redo, registrarAcao } = useGradeHistory({
    instancia: instanciaAtiva,
    canEdit,
    setItensGrade
  })

  // Controle de Impressão e Vigência
  const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false)
  const [modoImpressao, setModoImpressao] = useState<"TODOS" | "PROFESSOR">("TODOS")
  const [professorImpressao, setProfessorImpressao] = useState<string>("")
  const [textoVigencia, setTextoVigencia] = useState<string>("Válido a partir de 05/02/2026 • 1º Bimestre")
  const [editandoVigencia, setEditandoVigencia] = useState(false)

  // Controle de Tipografia / Fonte da Grade
  const [fonteGrade, setFonteGrade] = useState<IdFonteGrade>(() => getFonteGrade())

  function handleTrocarFonte(novaFonte: IdFonteGrade) {
    setFonteGrade(novaFonte)
    salvarFonteGrade(novaFonte)
    const opt = OPCOES_FONTES_GRADE.find(f => f.id === novaFonte)
    toast.success(`Tipografia alterada para ${opt?.nome || novaFonte}`, { duration: 1500, icon: '🔤' })
  }

  // Controle de Tamanho de Fonte da Grade (Professores e Disciplinas)
  const [tamanhoFonteRascunho, setTamanhoFonteRascunho] = useState<TamanhoFonteRascunho>(() => getTamanhoFonteRascunho())

  function handleTrocarTamanhoFonteRascunho(novoTamanho: TamanhoFonteRascunho) {
    setTamanhoFonteRascunho(novoTamanho)
    salvarTamanhoFonteRascunho(novoTamanho)
    const opt = OPCOES_TAMANHO_FONTE_RASCUNHO.find(f => f.id === novoTamanho)
    toast.success(`Tamanho da fonte das aulas: ${opt?.label || novoTamanho}`, { duration: 1500, icon: '🔍' })
  }

  // Filtros Básicos
  const [professorDestaque, setProfessorDestaque] = useState("")
  const [professorSelecionadoIndividual, setProfessorSelecionadoIndividual] = useState("")

  // NOVOS FILTROS DA FASE 1: Colunas (Séries/Turmas) e Linhas (Dias)
  const [turmaFiltro, setTurmaFiltro] = useState<string>("TODAS")
  const [turmasCustomizadas, setTurmasCustomizadas] = useState<string[]>([])
  const [modalTurmasCustomAberto, setModalTurmasCustomAberto] = useState(false)
  const [diasFiltro, setDiasFiltro] = useState<string[]>(["SEG", "TER", "QUA", "QUI", "SEX"])

  useEffect(() => {
    carregarDados(instanciaAtiva)
  }, [instanciaAtiva])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTelaCheia) {
        setIsTelaCheia(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isTelaCheia])

  function toggleTelaCheia() {
    setIsTelaCheia(prev => !prev)
  }

  // Manipulador para alternar dias da semana (Linhas)
  function handleToggleDia(dia: string) {
    if (dia === "TODOS") {
      setDiasFiltro(["SEG", "TER", "QUA", "QUI", "SEX"])
      toast.info("Visualizando todos os dias da semana", { duration: 1200 })
      return
    }

    // Se todos os 5 estavam selecionados e clicou em um dia específico, foca exclusivamente naquele dia!
    if (diasFiltro.length === 5) {
      setDiasFiltro([dia])
      toast.info(`Focando em ${dia}`, { duration: 1200 })
      return
    }

    // Se já estava selecionado, remove da seleção
    if (diasFiltro.includes(dia)) {
      const novos = diasFiltro.filter(d => d !== dia)
      if (novos.length === 0) {
        // Se ficou vazio, volta para todos
        setDiasFiltro(["SEG", "TER", "QUA", "QUI", "SEX"])
      } else {
        setDiasFiltro(novos)
      }
    } else {
      // Adiciona o dia
      const novos = [...diasFiltro, dia]
      if (novos.length === 5) {
        setDiasFiltro(["SEG", "TER", "QUA", "QUI", "SEX"])
      } else {
        setDiasFiltro(novos)
      }
    }
  }

  // Turmas do Ensino Integral (Explicitamente identificadas por turno !== 'Noturno' e formatadas como 1º A)
  const turmasIntegral = useMemo(() => {
    const cadastradas = turmasCadastradas.filter(t => t.turno !== "Noturno")
    if (cadastradas.length > 0) {
      return cadastradas.map(t => formatarNomeCurtoTurma(t.serie, t.nome))
    }
    return TURMAS_INTEGRAL_PADRAO
  }, [turmasCadastradas])

  // Turmas do Noturno (Explicitamente identificadas por turno === 'Noturno' e formatadas como 1º E)
  const turmasNoturno = useMemo(() => {
    const cadastradas = turmasCadastradas.filter(t => t.turno === "Noturno")
    if (cadastradas.length > 0) {
      return cadastradas.map(t => formatarNomeCurtoTurma(t.serie, t.nome))
    }
    return TURMAS_NOTURNO_PADRAO
  }, [turmasCadastradas])

  const turmasAtuaisAba = useMemo(() => {
    return abaAtiva === "NOTURNO" ? turmasNoturno : turmasIntegral
  }, [abaAtiva, turmasNoturno, turmasIntegral])

  // Nomes únicos de professores presentes na grade de horários (desvinculado da tabela de usuários)
  const professoresCadastrados = useMemo(() => {
    const nomes = new Set<string>()
    for (const item of itensGrade) {
      const nome = item.professor_nome?.trim().toUpperCase()
      if (nome) nomes.add(nome)
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b))
  }, [itensGrade])

  // Detecção de Conflitos
  const { conflitosSet, conflitosMap } = useMemo(() => {
    return detectarChoquesHorario(itensGrade)
  }, [itensGrade])

  const totalConflitos = conflitosMap.size
  // Permissão efetiva de edição na matriz: Coordenador/Admin E estar na aba de Edição (RASCUNHO)
  const podeEditarMatriz = canEdit && instanciaAtiva === "RASCUNHO"

  async function carregarDados(instancia: InstanciaGrade = instanciaAtiva) {
    try {
      setLoading(true)
      const [gradeData, discData, turmasData, visivel, vigencia] = await Promise.all([
        getGradeHorarios(undefined, instancia),
        getDisciplinas().catch(() => []),
        getTurmas().catch(() => []),
        getVisibilidadeGradeHorarios().catch(() => true),
        getVigenciaGrade(instancia).catch(() => "Válido a partir de 05/02/2026 • 1º Bimestre")
      ])

      setItensGrade(gradeData)
      setDisciplinas(discData)
      setTurmasCadastradas(turmasData)
      setIsGradePublicada(visivel)
      setTextoVigencia(vigencia)
    } catch (error) {
      console.error("Erro ao carregar dados do quadro de horários:", error)
      toast.error("Erro ao carregar dados dos horários")
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePublicacao() {
    if (!isAdmin) {
      toast.error("Apenas administradores podem alterar a visibilidade do quadro de horários.")
      return
    }

    try {
      setSalvandoPublicacao(true)
      const novoStatus = !isGradePublicada
      await setVisibilidadeGradeHorarios(novoStatus)
      setIsGradePublicada(novoStatus)
      if (novoStatus) {
        toast.success("Quadro de horários liberado para visualização de todos!", { icon: "👁️" })
      } else {
        toast.warning("Quadro de horários ocultado para professores (Modo Rascunho / Em Elaboração)", { icon: "🔒" })
      }
    } catch (err: any) {
      console.error("Erro ao alterar visibilidade da grade:", err)
      toast.error("Erro ao atualizar visibilidade")
    } finally {
      setSalvandoPublicacao(false)
    }
  }

  async function handleCopiarVisualizacao() {
    try {
      setCopiandoVisualizacao(true)
      const total = await copiarInstanciaVisualizacaoParaEdicao()
      setDialogCopiarAberto(false)
      await carregarDados("RASCUNHO")
      toast.success(`${total} aulas copiadas da Visualização para o Rascunho com sucesso!`, { icon: "📋" })
    } catch (err: any) {
      console.error("Erro ao copiar grade:", err)
      toast.error("Erro ao copiar dados da visualização", { description: err?.message })
    } finally {
      setCopiandoVisualizacao(false)
    }
  }

  async function handleConfirmarPublicacao(novoTextoVigencia: string) {
    try {
      const total = await publicarInstanciaEdicao(novoTextoVigencia)
      setTextoVigencia(novoTextoVigencia)
      setInstanciaAtiva("PUBLICADA")
      await carregarDados("PUBLICADA")
      toast.success(`${total} aulas publicadas oficialmente com sucesso!`, { icon: "🚀", duration: 4000 })
    } catch (err: any) {
      console.error("Erro ao publicar grade:", err)
      toast.error("Erro ao publicar horários", { description: err?.message })
      throw err
    }
  }

  // Ação de Salvar Célula (com suporte ao Histórico Undo/Redo)
  async function handleSalvarCelula(
    segmento: string,
    dia: string,
    aula: number,
    turma: string,
    disciplinaNome: string,
    professorNome: string,
    cor?: string
  ) {
    try {
      const profFormatado = professorNome.trim().toUpperCase()

      // Garante que a disciplina existe no cadastro de disciplinas
      const discReg = await garantirDisciplina(disciplinaNome)
      if (discReg && discReg.id && !disciplinas.some(d => d.id === discReg.id)) {
        setDisciplinas(prev => [...prev, discReg as Disciplina])
      }

      const itemAnterior = itensGrade.find(
        i => i.segmento === segmento && 
             i.dia_semana === dia && 
             i.numero_aula === aula && 
             normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(turma)
      )

      const salvo = await salvarCelulaGrade({
        instancia: instanciaAtiva,
        segmento,
        dia_semana: dia,
        numero_aula: aula,
        turma_nome: turma,
        disciplina_nome: disciplinaNome,
        disciplina_id: discReg?.id || null,
        professor_nome: profFormatado,
        cor_destaque: cor || null
      })

      // Se uma cor foi escolhida, atualiza globalmente as demais aulas do mesmo professor na instância
      if (cor) {
        atualizarCorProfessorGlobal(profFormatado, cor, instanciaAtiva).catch(err => {
          console.warn("Aviso ao atualizar cor global:", err)
        })
      }

      // Atualiza estado local instantaneamente
      setItensGrade(prev => {
        const filtrado = prev.map(item => {
          if (cor && item.professor_nome?.toUpperCase() === professorNome.toUpperCase()) {
            return { ...item, cor_destaque: cor }
          }
          return item
        }).filter(
          i => !(
            i.segmento === segmento && 
            i.dia_semana === dia && 
            i.numero_aula === aula && 
            normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(turma)
          )
        )
        return [...filtrado, salvo]
      })

      // Registra no histórico de desfazer
      registrarAcao({
        tipo: "SET_CELULA",
        descricao: `${disciplinaNome} - ${profFormatado} (${turma})`,
        anterior: itemAnterior || null,
        novo: salvo
      })

      toast.success("Aula salva no rascunho!", { duration: 1500 })
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao salvar aula na grade", { description: err?.message })
    }
  }

  // Ação de Limpar Célula (com suporte ao Histórico Undo/Redo)
  async function handleLimparCelula(
    segmento: string,
    dia: string,
    aula: number,
    turma: string
  ) {
    try {
      const itemAnterior = itensGrade.find(
        i => i.segmento === segmento && 
             i.dia_semana === dia && 
             i.numero_aula === aula && 
             normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(turma)
      )

      await limparCelulaGrade(segmento, dia, aula, turma, instanciaAtiva)

      setItensGrade(prev => prev.filter(
        i => !(
          i.segmento === segmento && 
          i.dia_semana === dia && 
          i.numero_aula === aula && 
          normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(turma)
        )
      ))

      if (itemAnterior) {
        registrarAcao({
          tipo: "CLEAR_CELULA",
          descricao: `Limpar ${itemAnterior.disciplina_nome} (${turma})`,
          anterior: itemAnterior,
          segmento,
          dia,
          aula,
          turma
        })
      }

      toast.success("Horário liberado")
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao limpar horário")
    }
  }

  // Ação de Smart Swap (Inversão Atômica de 2 Células com suporte ao Histórico)
  async function handleTrocarCelulas(dados: DadosTrocaCelulas) {
    try {
      const itemAAnterior = itensGrade.find(
        i => i.dia_semana === dados.diaA &&
             i.numero_aula === dados.aulaA &&
             normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(dados.turmaA)
      )
      const itemBAnterior = itensGrade.find(
        i => i.dia_semana === dados.diaB &&
             i.numero_aula === dados.aulaB &&
             normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(dados.turmaB)
      )

      const discAReg = await garantirDisciplina(dados.disciplinaA)
      const discBReg = await garantirDisciplina(dados.disciplinaB)

      const [salvoA, salvoB] = await Promise.all([
        salvarCelulaGrade({
          instancia: instanciaAtiva,
          segmento: dados.segmentoA,
          dia_semana: dados.diaA,
          numero_aula: dados.aulaA,
          turma_nome: dados.turmaA,
          disciplina_nome: dados.disciplinaA,
          disciplina_id: discAReg?.id || null,
          professor_nome: dados.professorA.trim().toUpperCase(),
          cor_destaque: dados.corA || null
        }),
        salvarCelulaGrade({
          instancia: instanciaAtiva,
          segmento: dados.segmentoB,
          dia_semana: dados.diaB,
          numero_aula: dados.aulaB,
          turma_nome: dados.turmaB,
          disciplina_nome: dados.disciplinaB,
          disciplina_id: discBReg?.id || null,
          professor_nome: dados.professorB.trim().toUpperCase(),
          cor_destaque: dados.corB || null
        })
      ])

      setItensGrade(prev => {
        const limpo = prev.filter(i => {
          const isA = i.dia_semana === dados.diaA &&
                      i.numero_aula === dados.aulaA &&
                      normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(dados.turmaA)
          const isB = i.dia_semana === dados.diaB &&
                      i.numero_aula === dados.aulaB &&
                      normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(dados.turmaB)
          return !isA && !isB
        })
        return [...limpo, salvoA, salvoB]
      })

      if (itemAAnterior && itemBAnterior) {
        registrarAcao({
          tipo: "SWAP_CELULAS",
          descricao: `Troca: ${dados.disciplinaA} ⇄ ${dados.disciplinaB}`,
          celulaA: { anterior: itemAAnterior, novo: salvoA },
          celulaB: { anterior: itemBAnterior, novo: salvoB }
        })
      }

      toast.success(`Horários invertidos: ${dados.disciplinaA} ⇄ ${dados.disciplinaB}`, { icon: "🔄", duration: 2500 })
    } catch (err: any) {
      console.error("Erro ao trocar células:", err)
      toast.error("Erro ao inverter horários", { description: err?.message })
    }
  }

  async function handleVigenciaChange(novoTexto: string) {
    setTextoVigencia(novoTexto)
    try {
      await salvarVigenciaGrade(instanciaAtiva, novoTexto)
    } catch {}
  }

  function handleAbrirModalImpressao() {
    setModalImpressaoAberto(true)
  }

  function handleConfirmarImpressao(modo: "TODOS" | "PROFESSOR", prof?: string) {
    setModoImpressao(modo)
    if (prof) setProfessorImpressao(prof)
    setModalImpressaoAberto(false)
    setTimeout(() => {
      window.print()
    }, 250)
  }

  return (
    <>
      <div className={`print:hidden ${
        isTelaCheia 
          ? "fixed inset-0 z-[100] w-screen h-screen bg-background text-foreground flex flex-col p-2 sm:p-3 gap-2 overflow-hidden" 
          : painelContraido
            ? "flex flex-col gap-2 max-w-7xl mx-auto pb-6"
            : "flex flex-col gap-4 max-w-7xl mx-auto pb-10"
      }`}>
        {/* ========================================================================= */}
        {/* MODO SANFONA: CONTROLES CONTRAÍDOS (OCUPA APENAS UMA LINHA ESTREITA)       */}
        {/* ========================================================================= */}
        {painelContraido ? (
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 px-2.5 rounded-2xl bg-card border border-border/80 shadow-2xs text-xs print:hidden select-none">
            {/* LADO ESQUERDO: Abas de Turnos + Instância Ativa + Filtro de Dias + Alertas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5 p-0.5 bg-muted/80 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setAbaAtiva("INTEGRAL_COMPLETO")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "INTEGRAL_COMPLETO"
                      ? "bg-[#7f1d1d] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Integral Completo • Manhã e Tarde (1ª a 9ª)"
                >
                  <Clock className="h-3 w-3 inline mr-1 text-yellow-300" />
                  <span>Integral (1ª-9ª)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("MANHA")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "MANHA"
                      ? "bg-[#7f1d1d] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Integral • Manhã (1ª a 5ª)"
                >
                  <Sun className="h-3 w-3 inline mr-1 text-amber-300" />
                  <span>Manhã</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("TARDE")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "TARDE"
                      ? "bg-[#7f1d1d] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Integral • Tarde (6ª a 9ª)"
                >
                  <Sunset className="h-3 w-3 inline mr-1 text-orange-300" />
                  <span>Tarde</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("NOTURNO")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "NOTURNO"
                      ? "bg-[#7f1d1d] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Noturno (1ª a 4ª)"
                >
                  <Moon className="h-3 w-3 inline mr-1 text-indigo-300" />
                  <span>Noturno</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("POR_PROFESSOR")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "POR_PROFESSOR"
                      ? "bg-[#7f1d1d] text-white shadow-2xs"
                      : "text-primary hover:bg-primary/10"
                  }`}
                  title="Procure por Professor (Horário Individual)"
                >
                  <User className="h-3 w-3 inline mr-1" />
                  <span>Por Professor</span>
                </button>
              </div>

              {/* Seletor Rápido de Dias da Semana (Linhas) */}
              {abaAtiva !== "POR_PROFESSOR" && (
                <div className="flex items-center gap-0.5 p-0.5 bg-muted/60 rounded-xl border border-border/60 select-none">
                  <button
                    type="button"
                    onClick={() => handleToggleDia("TODOS")}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all ${
                      diasFiltro.length === 5
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Exibir todos os dias da semana"
                  >
                    Todos
                  </button>
                  {DIAS_SEMANA.map((dia) => {
                    const ativo = diasFiltro.includes(dia)
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => handleToggleDia(dia)}
                        className={`px-1.5 py-0.5 rounded-lg text-[11px] font-black transition-all ${
                          ativo
                            ? diasFiltro.length === 5
                              ? "text-foreground font-bold"
                              : "bg-[#7f1d1d] text-white shadow-2xs"
                            : "text-muted-foreground/50 hover:text-foreground line-through decoration-black/40"
                        }`}
                        title={`Clique para alternar o dia ${dia}`}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Botão Seletor de Instância Compacto */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setInstanciaAtiva(instanciaAtiva === "PUBLICADA" ? "RASCUNHO" : "PUBLICADA")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all border shadow-2xs flex items-center gap-1 ${
                    instanciaAtiva === "RASCUNHO"
                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30"
                  }`}
                  title="Clique para alternar entre Modo Edição (Rascunho) e Modo Visualização (Em Vigor)"
                >
                  {instanciaAtiva === "RASCUNHO" ? (
                    <>
                      <Edit3 className="h-3 w-3 text-amber-600" />
                      <span>Rascunho</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 text-emerald-600" />
                      <span>Em Vigor</span>
                    </>
                  )}
                </button>
              )}

              {/* Botões Desfazer / Refazer (Undo/Redo no modo Rascunho) */}
              {instanciaAtiva === "RASCUNHO" && canEdit && (
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={undo}
                    disabled={!canUndo}
                    className="h-7 w-7 rounded-lg"
                    title="Desfazer última alteração (Ctrl+Z)"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={redo}
                    disabled={!canRedo}
                    className="h-7 w-7 rounded-lg"
                    title="Refazer última alteração (Ctrl+Y)"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Conflitos Compacto se houver */}
              {totalConflitos > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 font-extrabold text-[11px] animate-pulse">
                  {totalConflitos} conflito{totalConflitos > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* LADO DIREITO: Filtros rápidos, Ações e Botão de Expandir Controles */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={isTelaCheia ? "default" : "outline"}
                size="sm"
                onClick={toggleTelaCheia}
                className={`h-7 px-2 text-xs transition-all ${
                  isTelaCheia 
                    ? "bg-[#7f1d1d] hover:bg-[#661717] text-white border-transparent shadow-xs" 
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
                title={isTelaCheia ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isTelaCheia ? <Minimize2 className="h-3.5 w-3.5 text-white" /> : <Maximize2 className="h-3.5 w-3.5 text-primary" />}
              </Button>

              {abaAtiva !== "POR_PROFESSOR" && (
                <>
                  <div className="relative w-36 sm:w-44">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Buscar professor..."
                      value={professorDestaque}
                      onChange={(e) => setProfessorDestaque(e.target.value)}
                      list="lista-professores-destaque"
                      className="pl-7 pr-6 h-7 text-xs font-semibold"
                    />
                    {professorDestaque && (
                      <button
                        type="button"
                        onClick={() => setProfessorDestaque("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Limpar busca"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Seletor Flexível de Turmas (Colunas) */}
                  <Select 
                    value={turmaFiltro} 
                    onValueChange={(val) => {
                      if (val === "CUSTOM_OPEN") {
                        setModalTurmasCustomAberto(true)
                      } else {
                        setTurmaFiltro(val)
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36 font-semibold">
                      <SelectValue placeholder="Turmas / Séries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODAS" className="font-bold">Todas as Turmas</SelectItem>
                      {abaAtiva !== "NOTURNO" && (
                        <>
                          <SelectItem value="SERIE_1" className="font-bold text-amber-700 dark:text-amber-300">
                            🌟 1ºs Anos (1º A, B, C, D)
                          </SelectItem>
                          <SelectItem value="SERIE_2" className="font-bold text-blue-700 dark:text-blue-300">
                            🌟 2ºs Anos (2º A, B, C)
                          </SelectItem>
                          <SelectItem value="SERIE_3" className="font-bold text-emerald-700 dark:text-emerald-300">
                            🌟 3ºs Anos (3º A, B, C)
                          </SelectItem>
                        </>
                      )}
                      <SelectSeparator />
                      {turmasAtuaisAba.map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          Turma {turma}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value="CUSTOM_OPEN" className="font-bold text-primary">
                        ⚙️ Seleção Personalizada...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={fonteGrade} onValueChange={(val) => handleTrocarFonte(val as IdFonteGrade)}>
                    <SelectTrigger className="h-7 text-xs w-28 gap-1 font-semibold" title="Tipografia da grade">
                      <Type className="h-3 w-3 text-primary shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_FONTES_GRADE.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Opção de Tamanho de Fonte das Aulas */}
                  <Select 
                    value={tamanhoFonteRascunho} 
                    onValueChange={(val) => handleTrocarTamanhoFonteRascunho(val as TamanhoFonteRascunho)}
                  >
                    <SelectTrigger 
                      className="h-7 text-xs w-32 gap-1 font-bold bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200 hover:bg-amber-500/20" 
                      title="Ajustar tamanho do texto de Disciplina e Professor na tabela de horários"
                    >
                      <ZoomIn className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_TAMANHO_FONTE_RASCUNHO.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          <span className="font-bold">{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Botão Publicar no Rascunho */}
              {instanciaAtiva === "RASCUNHO" && canEdit && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setModalPublicarAberto(true)}
                  className="h-7 px-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1"
                  title="Publicar horários deste rascunho com data de vigência"
                >
                  <UploadCloud className="h-3 w-3" />
                  <span className="hidden sm:inline">Publicar</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirModalImpressao}
                className="h-7 px-2 text-xs"
                title="Imprimir / PDF"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
              </Button>

              {/* Botão Sanfona: Expandir Controles */}
              <Button
                variant="outline"
                size="sm"
                onClick={togglePainelContraido}
                className="h-7 px-2 gap-1 text-xs font-bold border-[#7f1d1d]/30 text-[#7f1d1d] dark:text-[#f8b4bc] hover:bg-[#7f1d1d]/10 rounded-xl"
                title="Expandir todos os controles e opções"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Expandir</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MODO COMPLETO: CABEÇALHO, BANNERS, VIGÊNCIA E CONTROLES EXPANDIDOS        */
          /* ========================================================================= */
          <>
            {/* CABEÇALHO DA PÁGINA */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 print:hidden ${isTelaCheia ? 'pb-2.5' : 'pb-4'}`}>
              <div className="flex items-center gap-3">
                <Button
                  variant={isTelaCheia ? "default" : "outline"}
                  size="icon"
                  onClick={toggleTelaCheia}
                  className={`h-9 w-9 shrink-0 text-xs font-semibold rounded-xl transition-all ${
                    isTelaCheia ? "bg-[#7f1d1d] hover:bg-[#661717] text-white border-transparent" : "bg-card border-border hover:bg-muted"
                  }`}
                  title={isTelaCheia ? "Sair da tela cheia (ou pressione Esc)" : "Expandir em Tela Cheia (F11)"}
                >
                  {isTelaCheia ? <Minimize2 className="h-4 w-4 text-white" /> : <Maximize2 className="h-4 w-4 text-primary" />}
                </Button>
                <div className="p-2 sm:p-2.5 rounded-2xl bg-[#7f1d1d]/10 dark:bg-[#f8b4bc]/10 text-[#7f1d1d] dark:text-[#f8b4bc]">
                  <CalendarRange className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#7f1d1d] dark:text-[#f8b4bc]">
                      Quadro de Horários
                    </h1>
                    {isTelaCheia && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                        Modo Tela Cheia
                      </span>
                    )}
                  </div>
                  {!isTelaCheia && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Grade curricular dos professores e turmas do Ensino Integral e Noturno.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Seletor de Instância (Exclusivo Coordenação / Admin) */}
                {canEdit && (
                  <div className="flex items-center gap-1 p-1 bg-muted/80 rounded-2xl border border-border/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setInstanciaAtiva("PUBLICADA")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        instanciaAtiva === "PUBLICADA"
                          ? "bg-background text-emerald-700 dark:text-emerald-300 shadow-xs border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Visualizar a grade oficial em vigor atualmente vista pelos professores."
                    >
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Visualização (Em Vigor)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInstanciaAtiva("RASCUNHO")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        instanciaAtiva === "RASCUNHO"
                          ? "bg-amber-600 text-white shadow-xs font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Entrar na área de trabalho e edição (rascunho isolado para alterações)."
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edição (Rascunho)</span>
                    </button>
                  </div>
                )}

                {/* Botões Desfazer / Refazer (Undo/Redo no modo Rascunho) */}
                {instanciaAtiva === "RASCUNHO" && canEdit && (
                  <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-2xl border border-border/80">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={undo}
                      disabled={!canUndo}
                      className="h-7 px-2 text-xs font-bold gap-1"
                      title="Desfazer última alteração (Ctrl+Z)"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Desfazer</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={redo}
                      disabled={!canRedo}
                      className="h-7 px-2 text-xs font-bold gap-1"
                      title="Refazer última alteração (Ctrl+Y)"
                    >
                      <Redo2 className="h-3.5 w-3.5" />
                      <span>Refazer</span>
                    </Button>
                  </div>
                )}

                {/* Alerta de Conflitos se houver */}
                {totalConflitos > 0 && (
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-800 dark:text-red-300 text-xs font-bold shadow-2xs animate-pulse"
                    title={`${totalConflitos} choques de horários detectados nesta grade.`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    <span>{totalConflitos} Conflito{totalConflitos > 1 ? "s" : ""}</span>
                  </div>
                )}

                {/* Controle de Publicação/Visibilidade */}
                {isAdmin && instanciaAtiva === "PUBLICADA" && (
                  <button
                    type="button"
                    onClick={handleTogglePublicacao}
                    disabled={salvandoPublicacao}
                    className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                      isGradePublicada
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                        : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                    }`}
                    title={
                      isGradePublicada
                        ? "Visualização Liberada para Professores. Clique para desabilitar (modo Rascunho/Elaboração)."
                        : "Visualização Oculta para Professores (Em Elaboração). Clique para publicar e liberar acesso."
                    }
                  >
                    {isGradePublicada ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden sm:inline">Visualização:</span>
                        <span>Liberada</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="hidden sm:inline">Visualização:</span>
                        <span>Oculta</span>
                      </>
                    )}
                  </button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => carregarDados(instanciaAtiva)}
                  disabled={loading}
                  className="h-8 sm:h-9 gap-1.5 text-xs font-semibold rounded-xl"
                  title="Atualizar dados da grade"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Recarregar</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAbrirModalImpressao}
                  className={`h-8 sm:h-9 gap-1.5 text-xs font-semibold rounded-xl ${
                    instanciaAtiva === "RASCUNHO" ? "border-amber-500/40 text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20" : "bg-card hover:bg-muted"
                  }`}
                  title="Imprimir / Exportar grade em PDF"
                >
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span>{instanciaAtiva === "RASCUNHO" ? "Imprimir Pré-Divulgação / PDF" : "Imprimir / PDF"}</span>
                </Button>

                {/* Botão Sanfona: Contrair Controles */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePainelContraido}
                  className="h-8 sm:h-9 gap-1.5 text-xs font-bold rounded-xl border-[#7f1d1d]/30 text-[#7f1d1d] dark:text-[#f8b4bc] hover:bg-[#7f1d1d]/10"
                  title="Contrair todos os controles em uma linha estreita para maximizar o espaço da tabela"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Contrair Controles</span>
                </Button>
              </div>
            </div>

            {/* BARRA DE CONTROLES EXCLUSIVOS DA INSTÂNCIA DE EDIÇÃO (RASCUNHO) */}
            {instanciaAtiva === "RASCUNHO" && canEdit && (
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-xs font-medium text-amber-950 dark:text-amber-200 shadow-xs print:hidden">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-wide text-amber-900 dark:text-amber-100">
                        Instância de Edição (Rascunho)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-black uppercase">
                        Privado
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                      Faça as alterações com tranquilidade. Arraste para <strong>inverter horários</strong> ou use <strong>Ctrl+Z</strong> para desfazer.
                    </p>
                  </div>
                </div>

                {/* Grupo de Ferramentas e Ações do Rascunho */}
                <div className="flex items-center gap-2 flex-wrap justify-start xl:justify-end">
                  {/* Pílula Unificada de Ferramentas Inteligentes (Fase 3) */}
                  <div className="flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-amber-500/30 shadow-2xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalSnapshotsAberto(true)}
                      className="h-7 px-2.5 gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-950/50"
                      title="Salvar fotos de segurança na nuvem e restaurar versões anteriores da grade com 1 clique"
                    >
                      <Camera className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Snapshots</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalMetasAberto(true)}
                      className="h-7 px-2.5 gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-950/50"
                      title="Acompanhar distribuição semanal de aulas e metas por turma"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Carga Horária</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalJanelasAberto(true)}
                      className="h-7 px-2.5 gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-950/50"
                      title="Detectar horários ociosos (janelas) entre as aulas de cada professor"
                    >
                      <Radio className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Radar Janelas</span>
                    </Button>
                  </div>

                  {/* Ações de Cópia e Publicação */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogCopiarAberto(true)}
                    disabled={copiandoVisualizacao}
                    className="h-9 px-3 gap-1.5 text-xs font-bold bg-white dark:bg-slate-900 border-amber-500/40 text-foreground hover:bg-amber-100/60 dark:hover:bg-amber-950/40 whitespace-nowrap shadow-2xs"
                    title="Substitui o rascunho atual com uma cópia exata dos horários publicados na visualização."
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                    <span>Copiar da Visualização</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setModalPublicarAberto(true)}
                    className="h-9 px-3.5 gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs whitespace-nowrap shrink-0"
                    title="Abre o assistente para publicar esta grade com data de vigência para todos os professores."
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Publicar Horários...</span>
                  </Button>
                </div>
              </div>
            )}

            {/* AVISO QUANDO ESTÁ NA INSTÂNCIA DE VISUALIZAÇÃO COM DICA PARA O COORDENADOR */}
            {instanciaAtiva === "PUBLICADA" && canEdit && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-950 dark:text-emerald-200 print:hidden">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Modo de Visualização (Em Vigor):</strong> Esta é a grade oficial acessível para professores e turmas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInstanciaAtiva("RASCUNHO")}
                  className="inline-flex items-center gap-1 underline hover:text-emerald-900 dark:hover:text-white font-black text-xs whitespace-nowrap"
                >
                  <span>Ir para Área de Edição (Rascunho)</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* BANNER INTERATIVO DE VIGÊNCIA / DATA DO HORÁRIO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs print:hidden">
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="font-bold text-muted-foreground whitespace-nowrap">Vigência:</span>

                {canEdit && editandoVigencia ? (
                  <div className="flex items-center gap-1.5 flex-1 max-w-md">
                    <Input
                      value={textoVigencia}
                      onChange={(e) => setTextoVigencia(e.target.value)}
                      placeholder="Ex: Válido a partir de 05/02/2026 • Manhã"
                      className="h-7 text-xs font-bold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleVigenciaChange(textoVigencia)
                          setEditandoVigencia(false)
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs font-bold text-primary"
                      onClick={() => {
                        handleVigenciaChange(textoVigencia)
                        setEditandoVigencia(false)
                      }}
                    >
                      Concluir
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-extrabold text-foreground">{textoVigencia}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditandoVigencia(true)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                        title="Editar legenda de vigência"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                <span>{instanciaAtiva === "RASCUNHO" ? "Legenda de vigência do rascunho." : "Legenda oficial impressa no topo das páginas."}</span>
              </div>
            </div>

            {/* BARRA DE NAVEGAÇÃO DE TURNOS, DIAS E FILTROS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
              {/* Abas dos Turnos */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-2xl border border-border/80 overflow-x-auto select-none">
                <button
                  type="button"
                  onClick={() => setAbaAtiva("INTEGRAL_COMPLETO")}
                  title="Ensino Integral Completo (1ª a 9ª Aulas)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "INTEGRAL_COMPLETO"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  <span>Integral</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("MANHA")}
                  title="Turno da Manhã (1ª a 5ª Aulas)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "MANHA"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>Manhã</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("TARDE")}
                  title="Turno da Tarde (6ª a 9ª Aulas)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "TARDE"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sunset className="h-3.5 w-3.5 text-orange-500" />
                  <span>Tarde</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("NOTURNO")}
                  title="Turno Noturno (1ª a 4ª Aulas)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "NOTURNO"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Noturno</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("POR_PROFESSOR")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "POR_PROFESSOR"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-primary hover:bg-primary/10"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Por Professor</span>
                </button>
              </div>

              {/* BARRA DE FILTROS: DIAS (LINHAS) E TURMAS/SÉRIES (COLUNAS) */}
              {abaAtiva !== "POR_PROFESSOR" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Seletor Rápido de Dias da Semana (Linhas) */}
                  <div className="flex items-center gap-0.5 p-1 bg-muted/80 rounded-2xl border border-border/80 shadow-2xs select-none">
                    <span className="text-[11px] font-bold text-muted-foreground pl-1.5 pr-1 hidden sm:inline">Dias:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleDia("TODOS")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all ${
                        diasFiltro.length === 5
                          ? "bg-[#7f1d1d] text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Exibir todos os 5 dias da semana"
                    >
                      Todos
                    </button>
                    {DIAS_SEMANA.map((dia) => {
                      const ativo = diasFiltro.includes(dia)
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => handleToggleDia(dia)}
                          className={`px-2 py-1 rounded-xl text-xs font-black transition-all ${
                            ativo
                              ? diasFiltro.length === 5
                                ? "text-foreground font-bold hover:bg-background/60"
                                : "bg-[#7f1d1d] text-white shadow-2xs"
                              : "text-muted-foreground/40 hover:text-foreground line-through decoration-black/40"
                          }`}
                          title={`Filtrar para o dia ${dia}`}
                        >
                          {dia}
                        </button>
                      )
                    })}
                  </div>

                  {/* Busca por Professor */}
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar professor..."
                      value={professorDestaque}
                      onChange={(e) => setProfessorDestaque(e.target.value)}
                      list="lista-professores-destaque"
                      className="pl-8.5 pr-7 h-8.5 text-xs font-semibold"
                    />
                    {professorDestaque && (
                      <button
                        type="button"
                        onClick={() => setProfessorDestaque("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Limpar busca"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Seletor Flexível de Turmas / Séries (Colunas) */}
                  <Select 
                    value={turmaFiltro} 
                    onValueChange={(val) => {
                      if (val === "CUSTOM_OPEN") {
                        setModalTurmasCustomAberto(true)
                      } else {
                        setTurmaFiltro(val)
                      }
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-44 font-bold" title="Filtrar turmas ou visualizar por série">
                      <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                      <SelectValue placeholder="Turmas / Séries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODAS" className="font-bold">Todas as Turmas ({turmasAtuaisAba.length})</SelectItem>
                      {abaAtiva !== "NOTURNO" && (
                        <>
                          <SelectItem value="SERIE_1" className="font-bold text-amber-700 dark:text-amber-300">
                            🌟 1ºs Anos (1º A, B, C, D)
                          </SelectItem>
                          <SelectItem value="SERIE_2" className="font-bold text-blue-700 dark:text-blue-300">
                            🌟 2ºs Anos (2º A, B, C)
                          </SelectItem>
                          <SelectItem value="SERIE_3" className="font-bold text-emerald-700 dark:text-emerald-300">
                            🌟 3ºs Anos (3º A, B, C)
                          </SelectItem>
                        </>
                      )}
                      <SelectSeparator />
                      {turmasAtuaisAba.map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          Turma {turma}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value="CUSTOM_OPEN" className="font-bold text-primary">
                        ⚙️ Seleção Personalizada...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Seletor de Fonte da Grade */}
                  <Select value={fonteGrade} onValueChange={(val) => handleTrocarFonte(val as IdFonteGrade)}>
                    <SelectTrigger className="h-8.5 text-xs w-32 gap-1.5 font-semibold" title="Escolha a tipografia da grade para melhor legibilidade">
                      <Type className="h-3.5 w-3.5 text-primary shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_FONTES_GRADE.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          <span className="font-bold">{f.nome}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Seletor de Tamanho de Fonte da Grade */}
                  <Select 
                    value={tamanhoFonteRascunho} 
                    onValueChange={(val) => handleTrocarTamanhoFonteRascunho(val as TamanhoFonteRascunho)}
                  >
                    <SelectTrigger 
                      className="h-8.5 text-xs w-36 gap-1.5 font-bold bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200 hover:bg-amber-500/20" 
                      title="Ajustar tamanho do texto de Disciplina e Professor na tabela de horários"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_TAMANHO_FONTE_RASCUNHO.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          <span className="font-bold">{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* DICA DE EDIÇÃO QUANDO NO MODO RASCUNHO */}
            {podeEditarMatriz && abaAtiva !== "POR_PROFESSOR" && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 print:hidden select-none">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Dicas de Manuseio:</strong> Arraste para <strong>inverter</strong> (verde = livre, vermelho = choque) • <strong>Ctrl+C / Ctrl+V</strong> para copiar/colar • <strong>Del</strong> para limpar • <strong>Ctrl+Z</strong> para desfazer.
                  </span>
                </div>

                {diasFiltro.length < 5 && (
                  <button
                    type="button"
                    onClick={() => handleToggleDia("TODOS")}
                    className="underline font-bold text-amber-800 dark:text-amber-300 hover:text-foreground text-[11px]"
                  >
                    Exibindo {diasFiltro.length} dia{diasFiltro.length > 1 ? "s" : ""} (Restaurar todos)
                  </button>
                )}
              </div>
            )}
          </>
        )}

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <div 
        className={isTelaCheia ? "flex-1 overflow-auto rounded-xl" : "w-full"}
        style={{ fontFamily: getFontFamilyById(fonteGrade) }}
      >
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando grade de horários...
          </div>
        ) : !isGradePublicada && !canEdit ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-14 text-center max-w-lg mx-auto bg-card rounded-2xl border border-border shadow-xs my-6">
            <div className="p-4 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-4">
              <Lock className="h-10 w-10" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
              Quadro de Horários em Elaboração
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
              A coordenação pedagógica está organizando e ajustando a grade de horários da escola. A visualização das turmas e das suas aulas será liberada em breve pela administração.
            </p>
          </div>
        ) : (
          <>
            {abaAtiva === "INTEGRAL_COMPLETO" && (
              <GradeMatrizTurno
                segmento="INTEGRAL_COMPLETO"
                turmas={turmasIntegral}
                aulas={ESTRUTURA_AULAS.INTEGRAL_COMPLETO}
                itensGrade={itensGrade.filter(i => i.segmento === "INTEGRAL_MANHA" || i.segmento === "INTEGRAL_TARDE")}
                conflitosSet={conflitosSet}
                conflitosMap={conflitosMap}
                disciplinasDisponiveis={disciplinas}
                professoresCadastrados={professoresCadastrados}
                canEdit={podeEditarMatriz}
                professorFiltro={professorDestaque}
                turmaFiltro={turmaFiltro}
                turmasCustomizadas={turmasCustomizadas}
                diasFiltro={diasFiltro}
                tamanhoFonte={tamanhoFonteRascunho}
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
                onTrocarCelulas={handleTrocarCelulas}
              />
            )}

            {abaAtiva === "MANHA" && (
              <GradeMatrizTurno
                segmento="INTEGRAL_MANHA"
                turmas={turmasIntegral}
                aulas={ESTRUTURA_AULAS.INTEGRAL_MANHA}
                itensGrade={itensGrade.filter(i => i.segmento === "INTEGRAL_MANHA")}
                conflitosSet={conflitosSet}
                conflitosMap={conflitosMap}
                disciplinasDisponiveis={disciplinas}
                professoresCadastrados={professoresCadastrados}
                canEdit={podeEditarMatriz}
                professorFiltro={professorDestaque}
                turmaFiltro={turmaFiltro}
                turmasCustomizadas={turmasCustomizadas}
                diasFiltro={diasFiltro}
                tamanhoFonte={tamanhoFonteRascunho}
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
                onTrocarCelulas={handleTrocarCelulas}
              />
            )}

            {abaAtiva === "TARDE" && (
              <GradeMatrizTurno
                segmento="INTEGRAL_TARDE"
                turmas={turmasIntegral}
                aulas={ESTRUTURA_AULAS.INTEGRAL_TARDE}
                itensGrade={itensGrade.filter(i => i.segmento === "INTEGRAL_TARDE")}
                conflitosSet={conflitosSet}
                conflitosMap={conflitosMap}
                disciplinasDisponiveis={disciplinas}
                professoresCadastrados={professoresCadastrados}
                canEdit={podeEditarMatriz}
                professorFiltro={professorDestaque}
                turmaFiltro={turmaFiltro}
                turmasCustomizadas={turmasCustomizadas}
                diasFiltro={diasFiltro}
                tamanhoFonte={tamanhoFonteRascunho}
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
                onTrocarCelulas={handleTrocarCelulas}
              />
            )}

            {abaAtiva === "NOTURNO" && (
              <GradeMatrizTurno
                segmento="NOTURNO"
                turmas={turmasNoturno}
                aulas={ESTRUTURA_AULAS.NOTURNO}
                itensGrade={itensGrade.filter(i => i.segmento === "NOTURNO")}
                conflitosSet={conflitosSet}
                conflitosMap={conflitosMap}
                disciplinasDisponiveis={disciplinas}
                professoresCadastrados={professoresCadastrados}
                canEdit={podeEditarMatriz}
                professorFiltro={professorDestaque}
                turmaFiltro={turmaFiltro}
                turmasCustomizadas={turmasCustomizadas}
                diasFiltro={diasFiltro}
                tamanhoFonte={tamanhoFonteRascunho}
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
                onTrocarCelulas={handleTrocarCelulas}
              />
            )}

            {abaAtiva === "POR_PROFESSOR" && (
              <MinhasAulasView
                itensGrade={itensGrade}
                professorSelecionado={professorSelecionadoIndividual}
                professoresCadastrados={professoresCadastrados}
                onSelecionarProfessor={setProfessorSelecionadoIndividual}
              />
            )}
          </>
        )}
      </div>

      {/* MODAL DE SELEÇÃO PERSONALIZADA DE TURMAS (COLUNAS) */}
      <Dialog open={modalTurmasCustomAberto} onOpenChange={setModalTurmasCustomAberto}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
          <DialogHeader className="gap-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                  Selecionar Turmas Visíveis
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Marque as colunas que deseja visualizar na grade agora.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-border">
              <span className="font-bold text-muted-foreground">
                {turmasCustomizadas.length > 0 ? `${turmasCustomizadas.length} turmas marcadas` : "Nenhuma selecionada"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTurmasCustomizadas([...turmasAtuaisAba])}
                  className="text-primary hover:underline font-bold"
                >
                  Marcar Todas
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setTurmasCustomizadas([])}
                  className="text-muted-foreground hover:underline font-semibold"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
              {turmasAtuaisAba.map((turma) => {
                const checked = turmasCustomizadas.includes(turma)
                return (
                  <label
                    key={turma}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      checked 
                        ? "bg-primary/10 border-primary text-primary shadow-2xs"
                        : "bg-muted/40 border-border/80 text-foreground hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        if (val) {
                          setTurmasCustomizadas(prev => [...prev, turma])
                        } else {
                          setTurmasCustomizadas(prev => prev.filter(t => t !== turma))
                        }
                      }}
                    />
                    <span>{turma}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalTurmasCustomAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (turmasCustomizadas.length === 0) {
                  setTurmaFiltro("TODAS")
                } else {
                  setTurmaFiltro("CUSTOM")
                }
                setModalTurmasCustomAberto(false)
                toast.success("Filtro de turmas aplicado!")
              }}
              className="text-xs font-bold gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Aplicar Filtro</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO: COPIAR DA VISUALIZAÇÃO */}
      <Dialog open={dialogCopiarAberto} onOpenChange={setDialogCopiarAberto}>
        <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Copy className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  Copiar da Visualização
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Importar todos os horários publicados em vigor para a área de edição.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Deseja substituir o conteúdo atual do <strong>Rascunho de Edição</strong> pela grade atualmente publicada na <strong>Visualização Oficial</strong>?
            <br /><br />
            <span className="text-muted-foreground">
              Essa ação é ideal para começar a fazer alterações pontuais a partir da grade que já está no ar.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDialogCopiarAberto(false)}
              disabled={copiandoVisualizacao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopiarVisualizacao}
              disabled={copiandoVisualizacao}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5"
            >
              {copiandoVisualizacao ? "Copiando..." : "Confirmar e Copiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DATALIST PARA SUGESTÕES AUTOMÁTICAS DURANTE A DIGITAÇÃO DO PROFESSOR */}
      <datalist id="lista-professores-destaque">
        {professoresCadastrados.map((prof) => (
          <option key={prof} value={prof} />
        ))}
      </datalist>

      {/* MODAL DE PUBLICAÇÃO COM DATA E TURNO */}
      <PublicarHorariosModal
        open={modalPublicarAberto}
        onOpenChange={setModalPublicarAberto}
        onConfirmarPublicacao={handleConfirmarPublicacao}
        totalAulasRascunho={itensGrade.length}
        itensRascunho={itensGrade}
      />

      {/* MODAL DE SNAPSHOTS / PONTOS DE RESTAURAÇÃO NA NUVEM (Fase 3) */}
      <SnapshotsGradeModal
        open={modalSnapshotsAberto}
        onOpenChange={setModalSnapshotsAberto}
        onRestauracaoConcluida={carregarDados}
        totalAulasAtuais={itensGrade.length}
      />

      {/* MODAL DE METAS CURRICULARES POR TURMA (Fase 3) */}
      <MetasCurricularesModal
        open={modalMetasAberto}
        onOpenChange={setModalMetasAberto}
        turmas={abaAtiva === "NOTURNO" ? turmasNoturno : turmasIntegral}
        itensGrade={itensGrade}
        segmento={abaAtiva === "POR_PROFESSOR" ? "INTEGRAL_COMPLETO" : abaAtiva}
      />

      {/* MODAL DO RADAR DE JANELAS DOCENTES (Fase 3) */}
      <RadarJanelasDocentesModal
        open={modalJanelasAberto}
        onOpenChange={setModalJanelasAberto}
        itensGrade={itensGrade}
      />

      {/* MODAL DE IMPRESSÃO / ESCOLHA DO FORMATO */}
      <ImpressaoHorariosModal
        open={modalImpressaoAberto}
        onOpenChange={setModalImpressaoAberto}
        professoresCadastrados={professoresCadastrados}
        textoVigencia={textoVigencia}
        fonteSelecionada={fonteGrade}
        onFonteChange={handleTrocarFonte}
        onConfirmarImpressao={handleConfirmarImpressao}
      />
    </div>

    {/* RENDERIZADOR DEDICADO DE IMPRESSÃO / PDF (Visível apenas em @media print) */}
    <ImpressaoGradeCompleta
      modo={modoImpressao}
      professorSelecionado={professorImpressao || professorSelecionadoIndividual}
      textoVigencia={textoVigencia}
      turmasIntegral={turmasIntegral}
      turmasNoturno={turmasNoturno}
      itensGrade={itensGrade}
      isRascunho={instanciaAtiva === "RASCUNHO"}
      idFonte={fonteGrade}
    />
  </>
  )
}
