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
  TURMAS_INTEGRAL_PADRAO,
  TURMAS_NOTURNO_PADRAO,
  ESTRUTURA_AULAS,
  GradeHorarioItem 
} from "@/services/gradeHorarios"
import { getDisciplinas, Disciplina } from "@/services/disciplinas"
import { getTurmas, Turma } from "@/services/turmas"
import { GradeMatrizTurno } from "./GradeMatrizTurno"
import { MinhasAulasView } from "./MinhasAulasView"
import { ImpressaoHorariosModal } from "./ImpressaoHorariosModal"
import { ImpressaoGradeCompleta } from "./ImpressaoGradeCompleta"
import { PublicarHorariosModal } from "./PublicarHorariosModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  UserCheck,
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
  CheckCircle2,
  Layers,
  ArrowRight,
  Type,
  ChevronUp,
  ChevronDown
} from "lucide-react"

type AbaSegmento = "MANHA" | "TARDE" | "NOTURNO" | "MINHAS_AULAS"

export default function QuadroHorariosPage() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.papel === "Administrador"
  const isCoordenador = usuario?.papel === "Coordenador"
  const canEdit = isAdmin || isCoordenador
  const isProfessor = usuario?.papel === "Professor"
  const meuPrimeiroNome = (usuario?.nome_completo || usuario?.email || "").split(" ")[0].toUpperCase()

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
  const [modalPublicarAberto, setModalPublicarAberto] = useState(false)

  const [abaAtiva, setAbaAtiva] = useState<AbaSegmento>("MANHA")
  const [itensGrade, setItensGrade] = useState<GradeHorarioItem[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [turmasCadastradas, setTurmasCadastradas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [isTelaCheia, setIsTelaCheia] = useState(false)
  const [isGradePublicada, setIsGradePublicada] = useState(true)
  const [salvandoPublicacao, setSalvandoPublicacao] = useState(false)

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

  // Filtros
  const [professorDestaque, setProfessorDestaque] = useState("")
  const [turmaFiltro, setTurmaFiltro] = useState("TODAS")
  const [professorSelecionadoMinhasAulas, setProfessorSelecionadoMinhasAulas] = useState(meuPrimeiroNome)

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

  // Ação de Salvar Célula (com nome único do professor e cor)
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

      toast.success("Aula salva no rascunho!", { duration: 1500 })
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao salvar aula na grade", { description: err?.message })
    }
  }

  // Ação de Limpar Célula
  async function handleLimparCelula(
    segmento: string,
    dia: string,
    aula: number,
    turma: string
  ) {
    try {
      await limparCelulaGrade(segmento, dia, aula, turma, instanciaAtiva)

      setItensGrade(prev => prev.filter(
        i => !(
          i.segmento === segmento && 
          i.dia_semana === dia && 
          i.numero_aula === aula && 
          normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(turma)
        )
      ))

      toast.success("Horário liberado")
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao limpar horário")
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
            {/* LADO ESQUERDO: Abas de Turnos + Instância Ativa + Alertas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5 p-0.5 bg-muted/80 rounded-xl border border-border/60">
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
                  onClick={() => setAbaAtiva("MINHAS_AULAS")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "MINHAS_AULAS"
                      ? "bg-[#7f1d1d] text-white shadow-2xs"
                      : "text-primary hover:bg-primary/10"
                  }`}
                  title={isProfessor ? "Minhas Aulas" : "Por Professor"}
                >
                  <UserCheck className="h-3 w-3 inline mr-1" />
                  <span>{isProfessor ? "Minhas" : "Docente"}</span>
                </button>
              </div>

              {/* Botão Seletor de Instância Compacto (Coordenação / Admin) */}
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

              {/* Conflitos Compacto se houver */}
              {totalConflitos > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 font-extrabold text-[11px] animate-pulse">
                  {totalConflitos} conflito{totalConflitos > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* LADO DIREITO: Filtros rápidos, Ações e Botão de Expandir Controles */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {abaAtiva !== "MINHAS_AULAS" && (
                <>
                  <div className="relative w-32 sm:w-36">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Prof..."
                      value={professorDestaque}
                      onChange={(e) => setProfessorDestaque(e.target.value)}
                      className="pl-7 h-7 text-xs"
                    />
                  </div>

                  <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue placeholder="Turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODAS">Todas Turmas</SelectItem>
                      {(abaAtiva === "NOTURNO" ? turmasNoturno : turmasIntegral).map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          {turma}
                        </SelectItem>
                      ))}
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

              <Button
                variant={isTelaCheia ? "default" : "outline"}
                size="sm"
                onClick={toggleTelaCheia}
                className="h-7 px-2 text-xs"
                title={isTelaCheia ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isTelaCheia ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-primary" />}
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

                {/* Controle de Publicação/Visibilidade (Exclusivo Administrador na versão publicada) */}
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

                {/* Botão de Tela Cheia */}
                <Button
                  variant={isTelaCheia ? "default" : "outline"}
                  size="sm"
                  onClick={toggleTelaCheia}
                  className={`h-8 sm:h-9 gap-1.5 text-xs font-semibold rounded-xl transition-all ${
                    isTelaCheia ? "bg-[#7f1d1d] hover:bg-[#661717] text-white" : ""
                  }`}
                  title={isTelaCheia ? "Sair da tela cheia (ou pressione Esc)" : "Expandir em Tela Cheia (F11)"}
                >
                  {isTelaCheia ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>Sair</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 text-primary" />
                      <span>Tela Cheia</span>
                    </>
                  )}
                </Button>

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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-xs font-medium text-amber-950 dark:text-amber-200 shadow-sm print:hidden">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-wide text-amber-900 dark:text-amber-100">
                        Instância de Edição (Rascunho)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-black uppercase">
                        Privado
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                      Faça as alterações com tranquilidade. Os professores continuam vendo a versão oficial até que você clique em <strong>Publicar</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0 self-end md:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogCopiarAberto(true)}
                    disabled={copiandoVisualizacao}
                    className="h-8 gap-1.5 text-xs font-bold bg-white dark:bg-slate-900 border-amber-500/40 hover:bg-amber-100/60 dark:hover:bg-amber-950/40"
                    title="Substitui o rascunho atual com uma cópia exata dos horários publicados na visualização."
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                    <span>Copiar da Visualização</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setModalPublicarAberto(true)}
                    className="h-8 gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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

            {/* AVISO DE MODO RASCUNHO / EM ELABORAÇÃO SE ESTIVER OCULTO PARA PROFESSORES */}
            {!isGradePublicada && canEdit && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-900 dark:text-amber-200 print:hidden">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Atenção:</strong> O quadro de horários está temporariamente oculto no menu dos professores.
                  </span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleTogglePublicacao}
                    className="underline hover:text-amber-950 dark:hover:text-white font-extrabold text-[11px] whitespace-nowrap"
                  >
                    Liberar Acesso aos Professores
                  </button>
                )}
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

            {/* BARRA DE NAVEGAÇÃO DE TURNOS E VISÕES */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 print:hidden">
              {/* Abas dos Turnos */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-2xl border border-border/80 overflow-x-auto select-none">
                <button
                  type="button"
                  onClick={() => setAbaAtiva("MANHA")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "MANHA"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>Integral • Manhã (1ª a 5ª)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("TARDE")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "TARDE"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sunset className="h-3.5 w-3.5 text-orange-500" />
                  <span>Integral • Tarde (6ª a 9ª)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("NOTURNO")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "NOTURNO"
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Noturno (1ª a 4ª)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva("MINHAS_AULAS")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    abaAtiva === "MINHAS_AULAS"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-primary hover:bg-primary/10"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{isProfessor ? "Minhas Aulas" : "Por Professor"}</span>
                </button>
              </div>

              {/* Filtro Rápido e Seletor de Tipografia */}
              {abaAtiva !== "MINHAS_AULAS" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Destacar professor..."
                      value={professorDestaque}
                      onChange={(e) => setProfessorDestaque(e.target.value)}
                      className="pl-8.5 h-8.5 text-xs"
                    />
                  </div>

                  <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                    <SelectTrigger className="h-8.5 text-xs w-32">
                      <SelectValue placeholder="Turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODAS">Todas Turmas</SelectItem>
                      {(abaAtiva === "NOTURNO" ? turmasNoturno : turmasIntegral).map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          {turma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Seletor de Fonte da Grade */}
                  <Select value={fonteGrade} onValueChange={(val) => handleTrocarFonte(val as IdFonteGrade)}>
                    <SelectTrigger className="h-8.5 text-xs w-36 gap-1.5 font-semibold" title="Escolha a tipografia da grade para melhor legibilidade">
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
                </div>
              )}
            </div>

            {/* DICA DE EDIÇÃO QUANDO NO MODO RASCUNHO */}
            {podeEditarMatriz && abaAtiva !== "MINHAS_AULAS" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 print:hidden select-none">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Modo Edição Ativo:</strong> Clique para editar • <strong>Arraste</strong> para mover • Segure <strong>Ctrl</strong> e arraste para <strong>duplicar</strong> a aula.
                </span>
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
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
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
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
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
                onSalvarCelula={handleSalvarCelula}
                onLimparCelula={handleLimparCelula}
              />
            )}

            {abaAtiva === "MINHAS_AULAS" && (
              <MinhasAulasView
                itensGrade={itensGrade}
                professorSelecionado={professorSelecionadoMinhasAulas}
                professoresCadastrados={professoresCadastrados}
                isCoordinatorOrAdmin={canEdit}
                onSelecionarProfessor={setProfessorSelecionadoMinhasAulas}
              />
            )}
          </>
        )}
      </div>

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

      {/* MODAL DE PUBLICAÇÃO COM DATA E TURNO */}
      <PublicarHorariosModal
        open={modalPublicarAberto}
        onOpenChange={setModalPublicarAberto}
        onConfirmarPublicacao={handleConfirmarPublicacao}
        totalAulasRascunho={itensGrade.length}
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
      professorSelecionado={professorImpressao || professorSelecionadoMinhasAulas}
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

