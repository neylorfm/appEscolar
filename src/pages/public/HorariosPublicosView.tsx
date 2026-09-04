import { useState, useEffect, useMemo } from "react"
import { 
  Printer, 
  Flame, 
  Search, 
  User, 
  GraduationCap, 
  Filter,
  Layers,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  GradeHorarioItem, 
  ESTRUTURA_AULAS, 
  DIAS_SEMANA, 
  NOMES_DIAS, 
  getEstiloBadgeCor, 
  obterCorEfetivaProfessor, 
  normalizarNomeTurma,
  carregarGradeHorariosPublica,
  DadosGradePublica
} from "@/services/gradeHorarios"
import { ImpressaoGradeCompleta } from "@/pages/horarios/ImpressaoGradeCompleta"

const STORAGE_TURMA_FAVORITA = "app_escolar_turma_favorita_aluno"

type ModoVisualizacaoAluno = "TURMA" | "TURNO" | "PROFESSOR"

export function HorariosPublicosView() {
  const [dadosGrade, setDadosGrade] = useState<DadosGradePublica | null>(null)
  const [loading, setLoading] = useState(true)

  // Modos de Visualização
  const [modo, setModo] = useState<ModoVisualizacaoAluno>("TURMA")
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("")
  const [diaFiltro, setDiaFiltro] = useState<string>("TODOS")
  const [turnoMatriz, setTurnoMatriz] = useState<"INTEGRAL_COMPLETO" | "MANHA" | "TARDE" | "NOTURNO">("MANHA")
  const [buscaProfessor, setBuscaProfessor] = useState("")
  const [profSelecionado, setProfSelecionado] = useState<string>("")

  // Carregar dados na montagem
  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true)
        const data = await carregarGradeHorariosPublica()
        setDadosGrade(data)

        // Recupera turma salva ou escolhe a primeira disponível
        const salva = localStorage.getItem(STORAGE_TURMA_FAVORITA)
        if (salva && data.turmas.includes(salva)) {
          setTurmaSelecionada(salva)
        } else if (data.turmas.length > 0) {
          setTurmaSelecionada(data.turmas[0])
        }
      } catch (err) {
        console.error("Erro ao carregar grade de horários pública:", err)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  function handleSelecionarTurma(turma: string) {
    setTurmaSelecionada(turma)
    try {
      localStorage.setItem(STORAGE_TURMA_FAVORITA, turma)
    } catch {}
  }

  // Agrupamento das Turmas para Seleção Fácil
  const turmasAgrupadas = useMemo(() => {
    if (!dadosGrade) return { primeiros: [], segundos: [], terceiros: [], noturno: [], outras: [] }
    const primeiros: string[] = []
    const segundos: string[] = []
    const terceiros: string[] = []
    const noturno: string[] = []
    const outras: string[] = []

    for (const t of dadosGrade.turmas) {
      const norm = t.toUpperCase()
      if (norm.startsWith("1") || norm.includes("1º")) primeiros.push(t)
      else if (norm.startsWith("2") || norm.includes("2º")) segundos.push(t)
      else if (norm.startsWith("3") || norm.includes("3º")) terceiros.push(t)
      else if (norm.includes("NOT") || norm.includes("NOITE")) noturno.push(t)
      else outras.push(t)
    }

    return { primeiros, segundos, terceiros, noturno, outras }
  }, [dadosGrade])

  // Lista de Professores
  const professoresDisponiveis = useMemo(() => {
    if (!dadosGrade) return []
    const setProfs = new Set<string>()
    for (const item of dadosGrade.itens) {
      if (item.professor_nome?.trim()) {
        setProfs.add(item.professor_nome.trim().toUpperCase())
      }
    }
    return Array.from(setProfs).sort((a, b) => a.localeCompare(b))
  }, [dadosGrade])

  const professoresFiltrados = useMemo(() => {
    if (!buscaProfessor.trim()) return professoresDisponiveis.slice(0, 15)
    return professoresDisponiveis.filter(p => 
      p.toLowerCase().includes(buscaProfessor.toLowerCase().trim())
    )
  }, [professoresDisponiveis, buscaProfessor])

  // Mapa das aulas da turma selecionada: [dia]_[numero_aula] -> GradeHorarioItem
  const mapaAulasTurma = useMemo(() => {
    const mapa = new Map<string, GradeHorarioItem>()
    if (!dadosGrade || !turmaSelecionada) return mapa

    for (const item of dadosGrade.itens) {
      if (normalizarNomeTurma(item.turma_nome) === normalizarNomeTurma(turmaSelecionada)) {
        mapa.set(`${item.dia_semana}_${item.numero_aula}`, item)
      }
    }
    return mapa
  }, [dadosGrade, turmaSelecionada])

  // Identifica se a turma é Noturno
  const isTurmaNoturno = useMemo(() => {
    if (!turmaSelecionada) return false
    const item = dadosGrade?.itens.find(i => normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(turmaSelecionada))
    return item?.segmento === "NOTURNO" || turmaSelecionada.toUpperCase().includes("NOT")
  }, [dadosGrade, turmaSelecionada])

  const aulasTurno = isTurmaNoturno 
    ? ESTRUTURA_AULAS.NOTURNO 
    : ESTRUTURA_AULAS.INTEGRAL_COMPLETO

  const diasParaExibir = diaFiltro === "TODOS" ? DIAS_SEMANA : [diaFiltro as any]

  // Ação de Impressão da Turma
  function handleImprimirTurma() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 min-h-[300px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm font-semibold text-muted-foreground">Carregando horários de aulas...</span>
      </div>
    )
  }

  if (!dadosGrade || !dadosGrade.visivel) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-card border border-border max-w-2xl mx-auto my-6 shadow-xs">
        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
          <Info className="h-8 w-8" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-foreground">Quadro de Horários em Atualização</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md">
          {dadosGrade?.motivoOculto || "O horário das aulas está sendo atualizado pela coordenação e estará disponível em breve para todos os estudantes."}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="print:hidden flex flex-col gap-5 w-full">
      {/* BANNER DE EMERGÊNCIA ATIVA (SE HOUVER) */}
      {dadosGrade.isEmergenciaAtiva && dadosGrade.situacaoEmergencia && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-100 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-2xs shrink-0">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Aviso: Horário Emergencial em Vigor
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-600/20 text-amber-900 dark:text-amber-200">
                  Substituições Ativas
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                {dadosGrade.situacaoEmergencia.titulo}
              </p>
              <span className="text-[11px] text-muted-foreground">
                Válido para: <strong>{dadosGrade.situacaoEmergencia.diasAfetados.map(d => NOMES_DIAS[d]?.split('-')[0]).join(", ")}</strong>. Nos demais dias, o horário segue a grade oficial normal.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DE HORÁRIOS: Título, Vigência e Modos de Visão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-2xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              Quadro de Horários de Aulas
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>📅 {dadosGrade.vigencia}</span>
            <span>•</span>
            <span>Consulta oficial sem necessidade de login</span>
          </p>
        </div>

        {/* Alternador de Modos (Minha Turma vs Turno Completo vs Por Professor) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/60 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setModo("TURMA")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              modo === "TURMA"
                ? "bg-card text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Por Turma (Aluno)</span>
          </button>

          <button
            type="button"
            onClick={() => setModo("TURNO")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              modo === "TURNO"
                ? "bg-card text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Quadro Geral do Turno</span>
          </button>

          <button
            type="button"
            onClick={() => setModo("PROFESSOR")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              modo === "PROFESSOR"
                ? "bg-card text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Por Professor</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODO ALUNO: POR TURMA (O mais acessado pelos estudantes)               */}
      {/* ========================================================================= */}
      {modo === "TURMA" && (
        <div className="flex flex-col gap-4">
          {/* Seletor de Turma */}
          <div className="flex flex-col gap-2.5 p-4 rounded-3xl bg-card border border-border/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                Qual é a sua turma?
              </span>
              {turmaSelecionada && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
                    Turma: {turmaSelecionada}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleImprimirTurma}
                    className="h-7 px-2.5 text-xs font-bold gap-1 rounded-xl border-border text-foreground hover:bg-muted print:hidden"
                    title="Imprimir ou Salvar PDF desta turma"
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Imprimir Horário</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Chips de Turmas por Série */}
            <div className="flex flex-col gap-2 pt-1">
              {/* 1ºs Anos */}
              {turmasAgrupadas.primeiros.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] font-black text-muted-foreground uppercase w-14 shrink-0">1ºs Anos:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {turmasAgrupadas.primeiros.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelecionarTurma(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                          turmaSelecionada === t
                            ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                            : "bg-muted/50 hover:bg-muted border border-border/80 text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2ºs Anos */}
              {turmasAgrupadas.segundos.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] font-black text-muted-foreground uppercase w-14 shrink-0">2ºs Anos:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {turmasAgrupadas.segundos.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelecionarTurma(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                          turmaSelecionada === t
                            ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                            : "bg-muted/50 hover:bg-muted border border-border/80 text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3ºs Anos */}
              {turmasAgrupadas.terceiros.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] font-black text-muted-foreground uppercase w-14 shrink-0">3ºs Anos:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {turmasAgrupadas.terceiros.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelecionarTurma(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                          turmaSelecionada === t
                            ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                            : "bg-muted/50 hover:bg-muted border border-border/80 text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Noturno / Outras */}
              {(turmasAgrupadas.noturno.length > 0 || turmasAgrupadas.outras.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] font-black text-muted-foreground uppercase w-14 shrink-0">Noturno:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[...turmasAgrupadas.noturno, ...turmasAgrupadas.outras].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelecionarTurma(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                          turmaSelecionada === t
                            ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                            : "bg-muted/50 hover:bg-muted border border-border/80 text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filtro Rápido por Dia da Semana (Segunda a Sexta ou Todos) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setDiaFiltro("TODOS")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                diaFiltro === "TODOS"
                  ? "bg-foreground text-background font-black"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Semana Toda
            </button>
            {DIAS_SEMANA.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDiaFiltro(d)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  diaFiltro === d
                    ? "bg-foreground text-background font-black"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {NOMES_DIAS[d]?.split("-")[0]}
              </button>
            ))}
          </div>

          {/* GRADE SEMANAL DA TURMA SELECIONADA */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {diasParaExibir.map(dia => {
              const nomeDia = NOMES_DIAS[dia] || dia
              const isDiaEmergencia = dadosGrade.isEmergenciaAtiva && 
                dadosGrade.situacaoEmergencia?.diasAfetados.includes(dia)

              return (
                <div 
                  key={dia}
                  className={`flex flex-col rounded-3xl bg-card border overflow-hidden shadow-2xs transition-all ${
                    isDiaEmergencia 
                      ? "border-amber-500/40 ring-1 ring-amber-500/20" 
                      : "border-border/80"
                  }`}
                >
                  {/* Cabeçalho do Dia */}
                  <div className={`p-2.5 text-center border-b flex items-center justify-between px-3 ${
                    isDiaEmergencia 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200" 
                      : "bg-muted/30 border-border text-foreground"
                  }`}>
                    <span className="text-xs font-black uppercase tracking-wider">{nomeDia}</span>
                    {isDiaEmergencia && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-600 text-white flex items-center gap-1">
                        <Flame className="h-2.5 w-2.5" />
                        Ajuste
                      </span>
                    )}
                  </div>

                  {/* Lista de Aulas do Dia */}
                  <div className="flex flex-col divide-y divide-border/60 p-1.5 flex-1">
                    {aulasTurno.map(aula => {
                      const item = mapaAulasTurma.get(`${dia}_${aula.numero}`)
                      const temAula = Boolean(item && (item.disciplina_nome?.trim() || item.professor_nome?.trim()))
                      const prof = item?.professor_nome?.trim() || ""
                      const disc = item?.disciplina_nome?.trim() || ""
                      const corProf = item?.cor_destaque || (prof ? obterCorEfetivaProfessor(prof) : "")
                      const estiloBadge = corProf ? getEstiloBadgeCor(corProf) : undefined

                      return (
                        <div 
                          key={aula.numero}
                          className={`p-2 rounded-2xl flex flex-col gap-1 transition-all ${
                            temAula 
                              ? "hover:bg-muted/30" 
                              : "opacity-40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-extrabold text-muted-foreground">
                              {aula.rotulo}
                            </span>
                            {isDiaEmergencia && temAula && (
                              <span className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400">
                                Provisório
                              </span>
                            )}
                          </div>

                          {temAula ? (
                            <>
                              <span className="text-xs font-black text-foreground leading-tight">
                                {disc}
                              </span>
                              {prof && (
                                <div 
                                  className="self-start text-[10px] font-extrabold px-2 py-0.5 rounded-md max-w-full truncate shadow-2xs"
                                  style={estiloBadge}
                                >
                                  {prof}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground/60 py-1">
                              Sem aula alocada
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODO TURNO COMPLETO: QUADRO GERAL (Visão panorâmica)                   */}
      {/* ========================================================================= */}
      {modo === "TURNO" && (
        <div className="flex flex-col gap-3 p-4 rounded-3xl bg-card border border-border/80 shadow-2xs">
          {/* Seletor do Turno */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-muted-foreground uppercase">
              Selecione o Turno para Visualizar:
            </span>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setTurnoMatriz("MANHA")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  turnoMatriz === "MANHA" ? "bg-card text-foreground font-black shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Manhã (1ª a 5ª)
              </button>
              <button
                type="button"
                onClick={() => setTurnoMatriz("TARDE")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  turnoMatriz === "TARDE" ? "bg-card text-foreground font-black shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Tarde (6ª a 9ª)
              </button>
              <button
                type="button"
                onClick={() => setTurnoMatriz("NOTURNO")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  turnoMatriz === "NOTURNO" ? "bg-card text-foreground font-black shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Noturno (1ª a 4ª)
              </button>
            </div>
          </div>

          {/* Tabela Panorâmica com Scroll Horizontal Seguro */}
          <div className="overflow-x-auto rounded-2xl border border-border mt-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="p-2 text-center font-black border-r border-border w-16">DIA</th>
                  <th className="p-2 text-center font-black border-r border-border w-20">AULA</th>
                  {dadosGrade.turmas.map(t => (
                    <th key={t} className="p-2 text-center font-black border-r border-border min-w-[120px]">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIAS_SEMANA.map(dia => {
                  const aulasDoTurno = turnoMatriz === "NOTURNO" 
                    ? ESTRUTURA_AULAS.NOTURNO 
                    : turnoMatriz === "MANHA" 
                      ? ESTRUTURA_AULAS.INTEGRAL_MANHA 
                      : ESTRUTURA_AULAS.INTEGRAL_TARDE

                  return aulasDoTurno.map((aula, idx) => (
                    <tr key={`${dia}_${aula.numero}`} className="hover:bg-muted/20">
                      {idx === 0 && (
                        <td 
                          rowSpan={aulasDoTurno.length} 
                          className="p-2 text-center font-black bg-muted/20 border-r border-border align-middle uppercase"
                        >
                          {NOMES_DIAS[dia]?.split('-')[0]}
                        </td>
                      )}
                      <td className="p-2 text-center font-bold text-muted-foreground border-r border-border whitespace-nowrap">
                        {aula.rotulo}
                      </td>
                      {dadosGrade.turmas.map(t => {
                        const item = dadosGrade.itens.find(i => 
                          i.dia_semana === dia && 
                          i.numero_aula === aula.numero && 
                          normalizarNomeTurma(i.turma_nome) === normalizarNomeTurma(t)
                        )
                        const cor = item?.cor_destaque || (item?.professor_nome ? obterCorEfetivaProfessor(item.professor_nome) : "")
                        const estilo = cor ? getEstiloBadgeCor(cor) : undefined

                        return (
                          <td key={t} className="p-1.5 border-r border-border text-center align-middle">
                            {item?.disciplina_nome ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-black text-[11px] leading-tight line-clamp-1">
                                  {item.disciplina_nome}
                                </span>
                                {item.professor_nome && (
                                  <span 
                                    className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md truncate max-w-[110px]"
                                    style={estilo}
                                  >
                                    {item.professor_nome}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODO POR PROFESSOR: Busca individual de docente                        */}
      {/* ========================================================================= */}
      {modo === "PROFESSOR" && (
        <div className="flex flex-col gap-4 p-4 rounded-3xl bg-card border border-border/80 shadow-2xs">
          {/* Campo de Busca de Professor */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-primary" />
              Pesquisar Horário de um Professor(a):
            </span>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o nome do professor..."
                value={buscaProfessor}
                onChange={(e) => {
                  setBuscaProfessor(e.target.value)
                  if (!e.target.value) setProfSelecionado("")
                }}
                className="pl-9 pr-4 h-10 text-xs sm:text-sm font-medium rounded-xl uppercase"
              />
            </div>

            {/* Chips Rápidos de Professores */}
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
              {professoresFiltrados.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setProfSelecionado(p)
                    setBuscaProfessor(p)
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase transition-all ${
                    profSelecionado === p
                      ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                      : "bg-muted/40 hover:bg-muted border border-border text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Agenda do Professor Escolhido */}
          {profSelecionado ? (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
                <span className="text-xs font-black text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Agenda Semanal de: <strong className="text-primary uppercase">{profSelecionado}</strong>
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {dadosGrade.itens.filter(i => i.professor_nome?.toUpperCase() === profSelecionado).length} aulas alocadas
                </span>
              </div>

              {/* Grade Semanal do Professor */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {DIAS_SEMANA.map(dia => {
                  const aulasProf = dadosGrade.itens.filter(i => 
                    i.dia_semana === dia && 
                    i.professor_nome?.toUpperCase() === profSelecionado
                  ).sort((a, b) => a.numero_aula - b.numero_aula)

                  return (
                    <div key={dia} className="flex flex-col rounded-2xl bg-card border border-border overflow-hidden">
                      <div className="p-2 text-center bg-muted/30 border-b border-border font-black text-xs uppercase">
                        {NOMES_DIAS[dia]?.split('-')[0]}
                      </div>
                      <div className="p-2 flex flex-col gap-1.5 divide-y divide-border/60">
                        {aulasProf.length > 0 ? (
                          aulasProf.map((item, idx) => (
                            <div key={idx} className="pt-1.5 first:pt-0 flex flex-col gap-0.5">
                              <span className="text-[10px] font-extrabold text-muted-foreground">
                                {item.numero_aula}ª Aula ({item.segmento === "NOTURNO" ? "Noite" : "Integral"})
                              </span>
                              <span className="text-xs font-black text-primary">
                                Turma: {item.turma_nome}
                              </span>
                              <span className="text-[11px] font-medium text-foreground">
                                {item.disciplina_nome}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[11px] italic text-muted-foreground/60 py-3 text-center">
                            Sem aulas neste dia
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              Selecione um professor acima para consultar a agenda de aulas semanal.
            </div>
          )}
        </div>
      )}
      </div>

      {/* RENDERIZAÇÃO EXCLUSIVA PARA IMPRESSÃO EM FOLHA A4 (1 PÁGINA) */}
      {dadosGrade && turmaSelecionada && (
        <ImpressaoGradeCompleta
          modo="TURNO"
          dadosImpressao={{
            turno: isTurmaNoturno ? "NOTURNO" : "INTEGRAL_COMPLETO",
            turmas: [turmaSelecionada],
            dias: diaFiltro === "TODOS" ? undefined : [diaFiltro],
            filtroDescricaoTurmas: `Turma ${turmaSelecionada}`,
            filtroDescricaoDias: diaFiltro === "TODOS" ? "Segunda a Sexta" : NOMES_DIAS[diaFiltro as any]
          }}
          textoVigencia={dadosGrade.vigencia}
          turmasIntegral={dadosGrade.turmas}
          turmasNoturno={dadosGrade.turmas}
          itensGrade={dadosGrade.itens}
          isEmergencia={dadosGrade.isEmergenciaAtiva}
          tituloEmergencia={dadosGrade.situacaoEmergencia?.titulo}
          motivoEmergencia={dadosGrade.situacaoEmergencia?.motivo}
          diasEmergencia={dadosGrade.situacaoEmergencia?.diasAfetados}
        />
      )}
    </>
  )
}
