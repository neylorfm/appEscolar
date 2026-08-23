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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Lock
} from "lucide-react"

type AbaSegmento = "MANHA" | "TARDE" | "NOTURNO" | "MINHAS_AULAS"

export default function QuadroHorariosPage() {
  const { usuario } = useAuth()
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
  const [textoVigencia, setTextoVigencia] = useState<string>(() => {
    try {
      return localStorage.getItem("grade_horarios_vigencia") || "Válido a partir de 05/02/2026 • 1º Bimestre"
    } catch {
      return "Válido a partir de 05/02/2026 • 1º Bimestre"
    }
  })
  const [editandoVigencia, setEditandoVigencia] = useState(false)

  // Filtros
  const [professorDestaque, setProfessorDestaque] = useState("")
  const [turmaFiltro, setTurmaFiltro] = useState("TODAS")

  const isAdmin = usuario?.papel === "Administrador"
  const isCoordenador = usuario?.papel === "Coordenador"
  const canEdit = isAdmin || isCoordenador
  const isProfessor = usuario?.papel === "Professor"
  const meuPrimeiroNome = (usuario?.nome_completo || usuario?.email || "").split(" ")[0].toUpperCase()

  const [professorSelecionadoMinhasAulas, setProfessorSelecionadoMinhasAulas] = useState(meuPrimeiroNome)

  useEffect(() => {
    carregarDados()
  }, [])

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

  async function carregarDados() {
    try {
      setLoading(true)
      const [gradeData, discData, turmasData, visivel] = await Promise.all([
        getGradeHorarios(),
        getDisciplinas().catch(() => []),
        getTurmas().catch(() => []),
        getVisibilidadeGradeHorarios().catch(() => true)
      ])

      setItensGrade(gradeData)
      setDisciplinas(discData)
      setTurmasCadastradas(turmasData)
      setIsGradePublicada(visivel)
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
        segmento,
        dia_semana: dia,
        numero_aula: aula,
        turma_nome: turma,
        disciplina_nome: disciplinaNome,
        disciplina_id: discReg?.id || null,
        professor_nome: profFormatado,
        cor_destaque: cor || null
      })

      // Se uma cor foi escolhida, atualiza globalmente as demais aulas do mesmo professor
      if (cor) {
        atualizarCorProfessorGlobal(profFormatado, cor).catch(err => {
          console.warn("Aviso ao atualizar cor global:", err)
        })
      }

      // Atualiza estado local instantaneamente
      setItensGrade(prev => {
        const filtrado = prev.map(item => {
          // Se for outra aula do mesmo professor e tiver nova cor, sincroniza a cor
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

      toast.success("Aula salva com sucesso!", { duration: 1500 })
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
      await limparCelulaGrade(segmento, dia, aula, turma)

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

  function handleVigenciaChange(novoTexto: string) {
    setTextoVigencia(novoTexto)
    try {
      localStorage.setItem("grade_horarios_vigencia", novoTexto)
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
          ? "fixed inset-0 z-[100] w-screen h-screen bg-background text-foreground flex flex-col p-3 sm:p-4 gap-3.5 overflow-hidden" 
          : "flex flex-col gap-5 max-w-7xl mx-auto pb-12"
      }`}>
        {/* CABEÇALHO DA PÁGINA */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 print:hidden ${isTelaCheia ? 'pb-2.5' : 'pb-4'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-[#7f1d1d]/10 dark:bg-[#f8b4bc]/10 text-[#7f1d1d] dark:text-[#f8b4bc]">
            <CalendarRange className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
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

          {/* Controle de Publicação/Visibilidade (Exclusivo Administrador) */}
          {isAdmin && (
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

          {/* Botão de Tela Cheia (F11) */}
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
                <span>Sair da Tela Cheia</span>
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
            onClick={carregarDados}
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
            className="h-8 sm:h-9 gap-1.5 text-xs font-semibold rounded-xl bg-card hover:bg-muted"
            title="Imprimir / Exportar grade em PDF"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Imprimir / PDF</span>
          </Button>
        </div>
      </div>

      {/* AVISO DE MODO RASCUNHO / EM ELABORAÇÃO SE ESTIVER OCULTO */}
      {!isGradePublicada && canEdit && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-900 dark:text-amber-200 print:hidden">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Modo Rascunho / Em Elaboração:</strong> O quadro de horários está temporariamente oculto para os professores.
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
                onChange={(e) => handleVigenciaChange(e.target.value)}
                placeholder="Ex: Válido a partir de 05/02/2026 • 1º Bimestre"
                className="h-7 text-xs font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditandoVigencia(false)
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs font-bold text-primary"
                onClick={() => setEditandoVigencia(false)}
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
                  title="Editar legenda de vigência (Disponível apenas para Coordenação e Administrador)"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <span>Aparece no topo de todas as páginas impressas.</span>
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

        {/* Filtro Rápido de Destaque na Matriz */}
        {abaAtiva !== "MINHAS_AULAS" && (
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Destacar professor..."
                value={professorDestaque}
                onChange={(e) => setProfessorDestaque(e.target.value)}
                className="pl-8.5 h-8.5 text-xs"
              />
            </div>

            <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
              <SelectTrigger className="h-8.5 text-xs w-36">
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
          </div>
        )}
      </div>

      {/* DICA DE EDIÇÃO PARA COORDENADOR/ADMIN */}
      {canEdit && abaAtiva !== "MINHAS_AULAS" && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 print:hidden select-none">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Atalhos Rápidos:</strong> Clique para editar • <strong>Arraste</strong> para mover • Segure <strong>Ctrl</strong> e arraste para <strong>duplicar</strong> a aula.
          </span>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <div className={isTelaCheia ? "flex-1 overflow-auto rounded-xl" : "w-full"}>
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
                canEdit={canEdit}
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
                canEdit={canEdit}
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
                canEdit={canEdit}
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

      {/* MODAL DE IMPRESSÃO / ESCOLHA DO FORMATO */}
      <ImpressaoHorariosModal
        open={modalImpressaoAberto}
        onOpenChange={setModalImpressaoAberto}
        professoresCadastrados={professoresCadastrados}
        textoVigencia={textoVigencia}
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
    />
  </>
  )
}
