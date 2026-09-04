import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  OPCOES_FONTES_GRADE, 
  IdFonteGrade,
  DIAS_SEMANA,
  filtrarTurmasGrade,
  obterDescricaoFiltroTurmas
} from "@/services/gradeHorarios"
import { 
  Printer, 
  FileText, 
  User, 
  Calendar, 
  Type, 
  Search, 
  X, 
  Check, 
  Clock, 
  SlidersHorizontal,
  Flame,
  Sparkles
} from "lucide-react"
import { 
  ConfiguracaoEmergencias, 
  NOMES_DIAS 
} from "@/services/gradeHorarios"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ModoImpressaoModal = "ATUAL" | "TURNO" | "PROFESSOR" | "TODOS" | "EMERGENCIA"

export interface DadosVisualizacaoAtual {
  abaAtiva: "INTEGRAL_COMPLETO" | "MANHA" | "TARDE" | "NOTURNO" | "POR_PROFESSOR"
  turmaFiltro: string
  turmasCustomizadas?: string[]
  turmasAtuais: string[]
  diasFiltro: string[]
  professorDestaque?: string
  professorSelecionadoIndividual?: string
}

export interface OpcoesImpressaoConfirmadas {
  modo: ModoImpressaoModal
  turno?: "INTEGRAL_COMPLETO" | "MANHA" | "TARDE" | "NOTURNO"
  turmas?: string[]
  turmaFiltro?: string
  dias?: string[]
  professor?: string
  filtroDescricaoTurmas?: string
  filtroDescricaoDias?: string
  filtroDescricaoTurno?: string
  // Campos de horário emergencial
  tituloEmergencia?: string
  motivoEmergencia?: string
  instanciaEmergencia?: string
  somenteAulasEmergencia?: boolean
  situacaoEmergenciaId?: number
}

interface ImpressaoHorariosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professoresCadastrados: string[]
  textoVigencia: string
  fonteSelecionada?: IdFonteGrade
  onFonteChange?: (fonte: IdFonteGrade) => void
  visualizacaoAtual?: DadosVisualizacaoAtual
  turmasIntegral?: string[]
  turmasNoturno?: string[]
  configEmergencia?: ConfiguracaoEmergencias | null
  onConfirmarImpressao: (opcoes: OpcoesImpressaoConfirmadas) => void
}

const ROTULOS_ABAS: Record<string, string> = {
  INTEGRAL_COMPLETO: "Integral Completo (1ª a 9ª Aula)",
  MANHA: "Manhã (1ª a 5ª Aula)",
  TARDE: "Tarde (6ª a 9ª Aula)",
  NOTURNO: "Noturno (1ª a 4ª Aula)",
  POR_PROFESSOR: "Por Professor (Agenda Docente)"
}

export function ImpressaoHorariosModal({
  open,
  onOpenChange,
  professoresCadastrados = [],
  textoVigencia,
  fonteSelecionada = "inter",
  onFonteChange,
  visualizacaoAtual,
  turmasIntegral = [],
  turmasNoturno = [],
  configEmergencia,
  onConfirmarImpressao,
}: ImpressaoHorariosModalProps) {
  // Modo padrão: "ATUAL" (Visualização da tela com filtros ativos)
  const [modo, setModo] = useState<ModoImpressaoModal>("ATUAL")

  // Estado para modo "TURNO" avulso
  const [turnoEscolhido, setTurnoEscolhido] = useState<"INTEGRAL_COMPLETO" | "MANHA" | "TARDE" | "NOTURNO">("MANHA")
  const [turmaFiltroTurno, setTurmaFiltroTurno] = useState<string>("TODAS")
  const [diasFiltroTurno, setDiasFiltroTurno] = useState<string[]>(["SEG", "TER", "QUA", "QUI", "SEX"])

  // Estado para modo "PROFESSOR"
  const [professorEscolhido, setProfessorEscolhido] = useState<string>("")

  // Estado para modo "EMERGENCIA"
  const [situacaoEmergenciaEscolhidaId, setSituacaoEmergenciaEscolhidaId] = useState<number>(() => configEmergencia?.situacaoAtivaId || 1)
  const [omitirCelulasBranco, setOmitirCelulasBranco] = useState<boolean>(true)

  // Sincroniza valores iniciais quando o modal abre
  useEffect(() => {
    if (open) {
      setModo("ATUAL")
      if (visualizacaoAtual) {
        if (visualizacaoAtual.abaAtiva !== "POR_PROFESSOR") {
          setTurnoEscolhido(visualizacaoAtual.abaAtiva)
        }
        setTurmaFiltroTurno(visualizacaoAtual.turmaFiltro || "TODAS")
        setDiasFiltroTurno(
          visualizacaoAtual.diasFiltro && visualizacaoAtual.diasFiltro.length > 0 
            ? visualizacaoAtual.diasFiltro 
            : ["SEG", "TER", "QUA", "QUI", "SEX"]
        )
      }

      const profInicial = 
        visualizacaoAtual?.professorSelecionadoIndividual ||
        visualizacaoAtual?.professorDestaque ||
        professoresCadastrados[0] || 
        ""
      setProfessorEscolhido(profInicial)
    }
  }, [open, visualizacaoAtual, professoresCadastrados])

  // Lista de turmas com base no turno escolhido no modo TURNO
  const turmasDisponiveisTurno = turnoEscolhido === "NOTURNO" ? turmasNoturno : turmasIntegral

  function toggleDiaTurno(dia: string) {
    if (diasFiltroTurno.includes(dia)) {
      const novos = diasFiltroTurno.filter(d => d !== dia)
      setDiasFiltroTurno(novos.length === 0 ? ["SEG", "TER", "QUA", "QUI", "SEX"] : novos)
    } else {
      setDiasFiltroTurno([...diasFiltroTurno, dia])
    }
  }

  // Normalização para filtro de professores
  const normalizar = (txt: string) =>
    txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()

  const professoresFiltrados = professoresCadastrados.filter((p) => {
    if (!professorEscolhido.trim()) return true
    return normalizar(p).includes(normalizar(professorEscolhido))
  })

  // Descrições dos filtros da visualização atual
  const resumoAbaAtual = visualizacaoAtual ? ROTULOS_ABAS[visualizacaoAtual.abaAtiva] || visualizacaoAtual.abaAtiva : "Manhã"
  const resumoTurmasAtual = visualizacaoAtual 
    ? obterDescricaoFiltroTurmas(visualizacaoAtual.turmaFiltro, visualizacaoAtual.turmasCustomizadas, visualizacaoAtual.turmasAtuais.length)
    : "Todas as Turmas"
  const resumoDiasAtual = visualizacaoAtual?.diasFiltro && visualizacaoAtual.diasFiltro.length < 5
    ? visualizacaoAtual.diasFiltro.join(", ")
    : "Seg a Sex"
  const resumoProfAtual = visualizacaoAtual?.professorSelecionadoIndividual || visualizacaoAtual?.professorDestaque || ""

  function handleImprimir() {
    if (modo === "ATUAL") {
      // Se a tela ativa for Minhas Aulas / Por Professor
      if (visualizacaoAtual?.abaAtiva === "POR_PROFESSOR") {
        const prof = visualizacaoAtual.professorSelecionadoIndividual || visualizacaoAtual.professorDestaque || professorEscolhido
        onConfirmarImpressao({
          modo: "PROFESSOR",
          professor: prof,
          filtroDescricaoTurno: "Horário Individual do Docente",
        })
      } else {
        const turnoAtual = visualizacaoAtual?.abaAtiva || "MANHA"
        const baseTurmas = turnoAtual === "NOTURNO" ? turmasNoturno : turmasIntegral
        const turmasFiltradas = filtrarTurmasGrade(
          baseTurmas, 
          visualizacaoAtual?.turmaFiltro, 
          visualizacaoAtual?.turmasCustomizadas
        )
        const diasFiltrados = visualizacaoAtual?.diasFiltro && visualizacaoAtual.diasFiltro.length > 0
          ? visualizacaoAtual.diasFiltro
          : ["SEG", "TER", "QUA", "QUI", "SEX"]

        onConfirmarImpressao({
          modo: "ATUAL",
          turno: turnoAtual,
          turmas: turmasFiltradas,
          turmaFiltro: visualizacaoAtual?.turmaFiltro,
          dias: diasFiltrados,
          professor: visualizacaoAtual?.professorDestaque,
          filtroDescricaoTurno: ROTULOS_ABAS[turnoAtual],
          filtroDescricaoTurmas: resumoTurmasAtual,
          filtroDescricaoDias: resumoDiasAtual,
        })
      }
    } else if (modo === "TURNO") {
      const turmasFiltradas = filtrarTurmasGrade(turmasDisponiveisTurno, turmaFiltroTurno)
      const descTurmas = obterDescricaoFiltroTurmas(turmaFiltroTurno, undefined, turmasDisponiveisTurno.length)
      const descDias = diasFiltroTurno.length === 5 ? "Segunda a Sexta" : diasFiltroTurno.join(", ")

      onConfirmarImpressao({
        modo: "TURNO",
        turno: turnoEscolhido,
        turmas: turmasFiltradas,
        turmaFiltro: turmaFiltroTurno,
        dias: diasFiltroTurno,
        filtroDescricaoTurno: ROTULOS_ABAS[turnoEscolhido],
        filtroDescricaoTurmas: descTurmas,
        filtroDescricaoDias: descDias,
      })
    } else if (modo === "PROFESSOR") {
      onConfirmarImpressao({
        modo: "PROFESSOR",
        professor: professorEscolhido || professoresCadastrados[0] || "PROFESSOR",
      })
    } else if (modo === "EMERGENCIA") {
      const sit = configEmergencia?.situacoes.find(s => s.id === situacaoEmergenciaEscolhidaId) || configEmergencia?.situacoes[0]
      onConfirmarImpressao({
        modo: "EMERGENCIA",
        situacaoEmergenciaId: sit?.id,
        instanciaEmergencia: sit?.instanciaKey || "EMERGENCIA_1",
        tituloEmergencia: sit?.titulo || "Situação Emergencial",
        motivoEmergencia: sit?.motivo || "",
        dias: sit?.diasAfetados || ["SEG", "TER", "QUA", "QUI", "SEX"],
        somenteAulasEmergencia: omitirCelulasBranco
      })
    } else {
      // TODOS OS HORÁRIOS (Geral - 3 páginas)
      onConfirmarImpressao({
        modo: "TODOS",
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-5 rounded-2xl shadow-2xl border-border bg-card z-[250] max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Opções de Impressão / PDF
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Escolha o que deseja imprimir na folha A4 com os filtros desejados.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {/* SELEÇÃO PRINCIPAL DE OPÇÃO DE IMPRESSÃO */}
          <div className="grid grid-cols-2 gap-2">
            {/* Opção 1: Visualização Atual (com filtros da tela) - RECOMENDADO */}
            <button
              type="button"
              onClick={() => setModo("ATUAL")}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all relative ${
                modo === "ATUAL"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Visualização Atual</span>
                </div>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
                  Na tela
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Imprime exatamente o que está na tela agora com filtros ativos.
              </span>
            </button>

            {/* Opção 2: Por Turno Específico */}
            <button
              type="button"
              onClick={() => setModo("TURNO")}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                modo === "TURNO"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Por Turno</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Escolha turno (Integral, Manhã, Tarde, Noite) e turmas.
              </span>
            </button>

            {/* Opção 3: Por Professor */}
            <button
              type="button"
              onClick={() => setModo("PROFESSOR")}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                modo === "PROFESSOR"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <User className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Por Professor</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Agenda semanal completa de um docente específico.
              </span>
            </button>

            {/* Opção 4: Todos os Horários (Caderno Geral) */}
            <button
              type="button"
              onClick={() => setModo("TODOS")}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                modo === "TODOS"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Todos os Horários</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Gera 3 páginas (Pág 1: Manhã, Pág 2: Tarde, Pág 3: Noite).
              </span>
            </button>

            {/* Opção 5: Horário Emergencial (Situação Escolhida) */}
            <button
              type="button"
              onClick={() => setModo("EMERGENCIA")}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all col-span-2 ${
                modo === "EMERGENCIA"
                  ? "border-amber-600 bg-amber-500/15 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-xs"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Flame className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Horário Emergencial (Situação Escolhida)</span>
                </div>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-600 text-white">
                  Zero células em branco
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Imprime só a emergência escolhida com as aulas alocadas, sem células em branco.
              </span>
            </button>
          </div>

          {/* PAINEL DINÂMICO CONFORME O MODO ESCOLHIDO */}

          {/* 1. SE MODO FOR "ATUAL": Resumo dos Filtros Ativos da Tela */}
          {modo === "ATUAL" && (
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-primary/40 bg-primary/5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Filtros Ativos que serão Impressos:
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="h-3 w-3" /> Pronto para imprimir
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-background border border-border/70 flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Turno / Visão:</span>
                  <span className="font-extrabold text-foreground truncate">{resumoAbaAtual}</span>
                </div>

                <div className="p-2 rounded-lg bg-background border border-border/70 flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Turmas:</span>
                  <span className="font-extrabold text-foreground truncate">{resumoTurmasAtual}</span>
                </div>

                <div className="p-2 rounded-lg bg-background border border-border/70 flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Dias da Semana:</span>
                  <span className="font-extrabold text-foreground truncate">{resumoDiasAtual}</span>
                </div>

                <div className="p-2 rounded-lg bg-background border border-border/70 flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Docente / Destaque:</span>
                  <span className="font-extrabold text-foreground truncate">
                    {resumoProfAtual || "Todas as disciplinas"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SE MODO FOR "TURNO": Seletores rápidos de Turno, Turmas e Dias */}
          {modo === "TURNO" && (
            <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-border bg-muted/20 animate-in fade-in text-xs">
              {/* Escolha do Turno */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-bold text-foreground">Turno Desejado:</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTurnoEscolhido("INTEGRAL_COMPLETO")}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                      turnoEscolhido === "INTEGRAL_COMPLETO"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    Integral (1ª-9ª)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurnoEscolhido("MANHA")}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                      turnoEscolhido === "MANHA"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    Manhã (1ª-5ª)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurnoEscolhido("TARDE")}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                      turnoEscolhido === "TARDE"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    Tarde (6ª-9ª)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurnoEscolhido("NOTURNO")}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                      turnoEscolhido === "NOTURNO"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    Noturno (1ª-4ª)
                  </button>
                </div>
              </div>

              {/* Filtro de Turmas / Séries */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-bold text-foreground">Turmas a Imprimir:</Label>
                <Select value={turmaFiltroTurno} onValueChange={setTurmaFiltroTurno}>
                  <SelectTrigger className="h-8.5 text-xs font-semibold">
                    <SelectValue placeholder="Selecione as turmas" />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value="TODAS" className="font-bold">
                      Todas as Turmas do Turno ({turmasDisponiveisTurno.length})
                    </SelectItem>
                    {turnoEscolhido !== "NOTURNO" && (
                      <>
                        <SelectItem value="SERIE_1" className="font-bold text-amber-700 dark:text-amber-300">
                          🌟 Apenas 1ºs Anos
                        </SelectItem>
                        <SelectItem value="SERIE_2" className="font-bold text-blue-700 dark:text-blue-300">
                          🌟 Apenas 2ºs Anos
                        </SelectItem>
                        <SelectItem value="SERIE_3" className="font-bold text-emerald-700 dark:text-emerald-300">
                          🌟 Apenas 3ºs Anos
                        </SelectItem>
                      </>
                    )}
                    {turmasDisponiveisTurno.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        Turma {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Dias da Semana */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Dias da Semana:</Label>
                  <button
                    type="button"
                    onClick={() => setDiasFiltroTurno(["SEG", "TER", "QUA", "QUI", "SEX"])}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Marcar Todos
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DIAS_SEMANA.map((dia) => {
                    const ativo = diasFiltroTurno.includes(dia)
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDiaTurno(dia)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                          ativo
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. SE MODO FOR "PROFESSOR": Busca e Chips */}
          {modo === "PROFESSOR" && (
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-muted/20 animate-in fade-in">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Escolha o Professor(a):
                </span>
                {professorEscolhido && (
                  <span className="text-[10.5px] font-extrabold text-primary uppercase truncate max-w-[180px]">
                    {professorEscolhido}
                  </span>
                )}
              </Label>

              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome para filtrar..."
                  value={professorEscolhido}
                  onChange={(e) => setProfessorEscolhido(e.target.value)}
                  list="lista-professores-modal-impressao"
                  className="pl-8.5 pr-7 h-9 text-xs font-bold uppercase"
                  autoFocus
                />
                {professorEscolhido && (
                  <button
                    type="button"
                    onClick={() => setProfessorEscolhido("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Limpar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <datalist id="lista-professores-modal-impressao">
                  {professoresCadastrados.map((prof) => (
                    <option key={prof} value={prof} />
                  ))}
                </datalist>
              </div>

              {/* Chips Rápidos Filtrados em Tempo Real */}
              {professoresFiltrados.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                  {professoresFiltrados.map((prof) => (
                    <button
                      key={prof}
                      type="button"
                      onClick={() => setProfessorEscolhido(prof)}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase transition-all ${
                        professorEscolhido.toUpperCase().trim() === prof.toUpperCase().trim()
                          ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                          : "bg-background hover:bg-muted border border-border text-foreground"
                      }`}
                    >
                      {prof}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. SE MODO FOR "EMERGENCIA": Escolha da Situação de Emergência */}
          {modo === "EMERGENCIA" && (
            <div className="flex flex-col gap-3 p-3 rounded-xl border border-amber-500/40 bg-amber-500/5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-600" />
                  Escolha a Situação de Emergência para Imprimir:
                </span>
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
                  Sem células em branco
                </span>
              </div>

              {/* Seletor das 5 Situações */}
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((id) => {
                  const sit = configEmergencia?.situacoes.find(s => s.id === id)
                  const isSelecionada = id === situacaoEmergenciaEscolhidaId
                  const isAtiva = id === configEmergencia?.situacaoAtivaId

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSituacaoEmergenciaEscolhidaId(id)}
                      className={`p-1.5 rounded-lg border text-center text-xs transition-all ${
                        isSelecionada
                          ? "bg-amber-600 text-white border-amber-600 font-black shadow-xs scale-105"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="font-extrabold text-[11px]">Sit. {id}</div>
                      <div className="text-[9px] opacity-80 truncate">
                        {isAtiva ? "🟢 No Ar" : `${sit?.totalAulas || 0} aulas`}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Detalhes da Situação Selecionada */}
              {(() => {
                const sitAtual = configEmergencia?.situacoes.find(s => s.id === situacaoEmergenciaEscolhidaId) || configEmergencia?.situacoes[0]
                const diasTexto = sitAtual?.diasAfetados.map(d => NOMES_DIAS[d]?.split('-')[0] || d).join(", ") || "Segunda a Sexta"

                return (
                  <div className="p-2.5 rounded-lg bg-background border border-border/80 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-900 dark:text-amber-200">
                        {sitAtual?.titulo || `Situação ${situacaoEmergenciaEscolhidaId}`}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground font-mono font-bold">
                        {sitAtual?.totalAulas || 0} aulas cadastradas
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Dias afetados: <strong className="text-foreground">{diasTexto}</strong></span>
                      {sitAtual?.motivo && (
                        <span>• Motivo: <em className="text-foreground">{sitAtual.motivo}</em></span>
                      )}
                    </div>

                    {/* Checkbox: Omitir células em branco */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                      <input
                        type="checkbox"
                        id="check-omitir-branco"
                        checked={omitirCelulasBranco}
                        onChange={(e) => setOmitirCelulasBranco(e.target.checked)}
                        className="rounded cursor-pointer h-3.5 w-3.5 accent-amber-600"
                      />
                      <label htmlFor="check-omitir-branco" className="text-[11px] font-bold text-foreground cursor-pointer select-none">
                        Imprimir somente as aulas de emergência cadastradas (ocultar todas as células em branco)
                      </label>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Seleção de Tipografia para a Grade/Impressão */}
          {onFonteChange && (
            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-primary" />
                Tipografia da Folha A4:
              </Label>
              <Select value={fonteSelecionada} onValueChange={(val) => onFonteChange(val as IdFonteGrade)}>
                <SelectTrigger className="h-8.5 text-xs font-semibold">
                  <SelectValue placeholder="Selecione a fonte" />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {OPCOES_FONTES_GRADE.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      <span className="font-bold">{f.nome}</span> — <span className="text-muted-foreground">{f.descricao}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Informação de Vigência do Documento */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/30">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Vigência no Cabeçalho da Impressão:
              </span>
              <span className="text-xs font-extrabold text-foreground truncate">
                {textoVigencia || "Válido a partir de 05/02/2026 • 1º Bimestre"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleImprimir}
            className="h-9 text-xs font-bold bg-[#7f1d1d] hover:bg-[#661717] text-white gap-1.5 shadow-md"
          >
            <Printer className="h-4 w-4" />
            {modo === "ATUAL" ? "Imprimir Tela Atual (A4)" : "Imprimir / Salvar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
