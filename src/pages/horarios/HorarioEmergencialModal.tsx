import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Flame, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Edit3, 
  Printer, 
  Trash2, 
  Calendar, 
  RotateCcw,
  ShieldCheck
} from "lucide-react"
import { 
  SituacaoEmergencia, 
  ConfiguracaoEmergencias, 
  getConfiguracaoEmergencias, 
  salvarConfiguracaoEmergencias, 
  ativarSituacaoEmergencia, 
  copiarGradeParaEmergencia, 
  limparGradeEmergencia,
  DIAS_SEMANA,
  NOMES_DIAS
} from "@/services/gradeHorarios"
import { toast } from "sonner"

interface HorarioEmergencialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAbrirEdicaoEmergencia: (instanciaKey: string, titulo: string) => void
  onEmergenciaAtivada: () => Promise<void>
  onEmergenciaDesativada: () => Promise<void>
  onAbrirImpressaoEmergencia?: (instanciaKey: string, titulo: string, diasAfetados?: string[], motivo?: string) => void
}

export function HorarioEmergencialModal({
  open,
  onOpenChange,
  onAbrirEdicaoEmergencia,
  onEmergenciaAtivada,
  onEmergenciaDesativada,
  onAbrirImpressaoEmergencia
}: HorarioEmergencialModalProps) {
  const [config, setConfig] = useState<ConfiguracaoEmergencias | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)
  const [situacaoSelecionadaId, setSituacaoSelecionadaId] = useState<number>(1)
  const [copiando, setCopiando] = useState<boolean>(false)
  const [salvando, setSalvando] = useState<boolean>(false)
  const [limpando, setLimpando] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      carregarConfiguracao()
    }
  }, [open])

  async function carregarConfiguracao() {
    try {
      setCarregando(true)
      const data = await getConfiguracaoEmergencias()
      setConfig(data)
      // Se houver alguma situação ativa, seleciona ela por padrão
      if (data.situacaoAtivaId) {
        setSituacaoSelecionadaId(data.situacaoAtivaId)
      }
    } catch (err) {
      console.error("Erro ao carregar configurações de emergência:", err)
      toast.error("Não foi possível carregar as situações de emergência.")
    } finally {
      setCarregando(false)
    }
  }

  const situacaoAtual = config?.situacoes.find(s => s.id === situacaoSelecionadaId) || config?.situacoes[0]
  const isSituacaoAtiva = config?.situacaoAtivaId === situacaoAtual?.id

  function handleAtualizarSituacaoAtual(alteracoes: Partial<SituacaoEmergencia>) {
    if (!config || !situacaoAtual) return
    const novasSituacoes = config.situacoes.map(s => {
      if (s.id === situacaoAtual.id) {
        return { ...s, ...alteracoes }
      }
      return s
    })
    const novaConfig = { ...config, situacoes: novasSituacoes }
    setConfig(novaConfig)
  }

  async function handleSalvarDados() {
    if (!config) return
    try {
      setSalvando(true)
      await salvarConfiguracaoEmergencias(config)
      toast.success("Configuração da situação salva com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao salvar configuração.")
    } finally {
      setSalvando(false)
    }
  }

  function handleToggleDia(dia: "SEG" | "TER" | "QUA" | "QUI" | "SEX") {
    if (!situacaoAtual) return
    const dias = situacaoAtual.diasAfetados || []
    let novosDias: ("SEG" | "TER" | "QUA" | "QUI" | "SEX")[] = []
    if (dias.includes(dia)) {
      if (dias.length === 1) {
        toast.info("Selecione pelo menos um dia para a situação de emergência.")
        return
      }
      novosDias = dias.filter(d => d !== dia)
    } else {
      novosDias = [...dias, dia]
    }
    handleAtualizarSituacaoAtual({ diasAfetados: novosDias })
  }

  function handleDefinirDiasPredefinidos(qtd: number) {
    if (!situacaoAtual) return
    let novosDias: ("SEG" | "TER" | "QUA" | "QUI" | "SEX")[] = []
    if (qtd === 1) novosDias = ["SEG"]
    else if (qtd === 2) novosDias = ["SEG", "TER"]
    else if (qtd === 3) novosDias = ["SEG", "TER", "QUA"]
    else if (qtd === 4) novosDias = ["SEG", "TER", "QUA", "QUI"]
    else novosDias = ["SEG", "TER", "QUA", "QUI", "SEX"]
    handleAtualizarSituacaoAtual({ diasAfetados: novosDias })
  }

  async function handleCopiarOficial() {
    if (!situacaoAtual) return
    try {
      setCopiando(true)
      const count = await copiarGradeParaEmergencia(situacaoAtual.instanciaKey, situacaoAtual.diasAfetados)
      toast.success(`Cópia concluída! ${count} aulas copiadas da grade oficial para a ${situacaoAtual.titulo}.`)
      await carregarConfiguracao()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao copiar grade oficial.")
    } finally {
      setCopiando(false)
    }
  }

  async function handleLimparSlot() {
    if (!situacaoAtual) return
    if (!window.confirm(`Deseja realmente limpar todas as aulas cadastradas na "${situacaoAtual.titulo}"?`)) {
      return
    }
    try {
      setLimpando(true)
      await limparGradeEmergencia(situacaoAtual.instanciaKey)
      toast.success(`Aulas da ${situacaoAtual.titulo} foram limpas com sucesso.`)
      await carregarConfiguracao()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao limpar aulas da emergência.")
    } finally {
      setLimpando(false)
    }
  }

  async function handleAtivarOuDesativar() {
    if (!config || !situacaoAtual) return

    try {
      setSalvando(true)
      if (isSituacaoAtiva) {
        // Desativa a emergência e volta ao normal
        await ativarSituacaoEmergencia(null)
        toast.success("🚨 Horário emergencial encerrado. Grade normal oficial restabelecida!")
        await onEmergenciaDesativada()
      } else {
        // Salva as alterações da situação atual antes de ativar
        await salvarConfiguracaoEmergencias(config)
        await ativarSituacaoEmergencia(situacaoAtual.id)
        toast.success(`🚨 ${situacaoAtual.titulo} colocada em vigor com sucesso!`)
        await onEmergenciaAtivada()
      }
      await carregarConfiguracao()
    } catch (err) {
      console.error(err)
      toast.error("Erro ao alterar status da situação emergencial.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-5 rounded-2xl shadow-2xl border-border bg-card">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                Horários Temporários e Emergenciais
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  5 Situações Flexíveis
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Crie grades pontuais para cobrir ausências ou atestados médicos de professores (de 1 a 5 dias). Depois, volte ao normal com 1 clique.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {carregando ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Carregando situações de emergência...
          </div>
        ) : !config || !situacaoAtual ? (
          <div className="py-8 text-center text-xs text-red-500">
            Falha ao carregar situações.
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* Banner de Status Global (Se houver emergência ativa) */}
            {config.situacaoAtivaId ? (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                      HORÁRIO EMERGENCIAL EM VIGOR: Situação {config.situacaoAtivaId}
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      {config.situacoes.find(s => s.id === config.situacaoAtivaId)?.titulo} • Válido para:{" "}
                      {config.situacoes.find(s => s.id === config.situacaoAtivaId)?.diasAfetados.map(d => NOMES_DIAS[d]?.split('-')[0]).join(", ")}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await ativarSituacaoEmergencia(null)
                    toast.success("🚨 Horário de emergência encerrado. Retornado à grade normal!")
                    await onEmergenciaDesativada()
                    await carregarConfiguracao()
                  }}
                  className="h-8 px-3 text-xs font-bold gap-1.5 shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Voltar ao Normal</span>
                </Button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Horário Oficial da Escola em Vigor (Nenhuma emergência ativa no momento).
                </span>
              </div>
            )}

            {/* Abas das 5 Situações de Emergência */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-foreground">
                Selecione uma das 5 Situações de Emergência:
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {config.situacoes.map((sit) => {
                  const isSelecionada = sit.id === situacaoSelecionadaId
                  const isAtiva = sit.id === config.situacaoAtivaId

                  return (
                    <button
                      key={sit.id}
                      type="button"
                      onClick={() => setSituacaoSelecionadaId(sit.id)}
                      className={`flex flex-col p-2 rounded-xl text-left border transition-all relative ${
                        isSelecionada
                          ? "border-amber-600 bg-amber-500/15 ring-2 ring-amber-500/30 shadow-xs"
                          : "border-border bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black text-foreground">
                          Situação {sit.id}
                        </span>
                        {isAtiva ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-600 text-white animate-pulse">
                            EM VIGOR
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-muted-foreground font-mono">
                            {sit.totalAulas || 0} aulas
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate mt-0.5" title={sit.titulo}>
                        {sit.titulo.replace(`Situação ${sit.id} - `, '')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Card Detalhado da Situação Selecionada */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Configurando Situação {situacaoAtual.id}
                  </span>
                  {isSituacaoAtiva && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">
                      Ativa como Emergência Oficial
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {situacaoAtual.totalAulas || 0} aula{(situacaoAtual.totalAulas || 0) === 1 ? '' : 's'} no slot
                  </span>
                </div>
              </div>

              {/* Título e Motivo da Situação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-bold text-foreground">
                    Nome / Título da Situação:
                  </Label>
                  <Input
                    value={situacaoAtual.titulo}
                    onChange={(e) => handleAtualizarSituacaoAtual({ titulo: e.target.value })}
                    placeholder="Ex: Falta Prof. Carlos e Profa. Maria"
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-bold text-foreground">
                    Motivo / Vigência Provisória (Opcional):
                  </Label>
                  <Input
                    value={situacaoAtual.motivo || ""}
                    onChange={(e) => handleAtualizarSituacaoAtual({ motivo: e.target.value })}
                    placeholder="Ex: Atestado médico de 3 dias (08/09 a 10/09)"
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Seleção dos Dias da Semana Afetados */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/70">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Dias Afetados por Esta Emergência (1 a 5 dias):
                  </Label>
                  
                  {/* Atalhos Rápidos */}
                  <div className="flex items-center gap-1 text-[10.5px]">
                    <span className="text-muted-foreground mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => handleDefinirDiasPredefinidos(1)}
                      className="px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold border border-border"
                    >
                      1 Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDefinirDiasPredefinidos(2)}
                      className="px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold border border-border"
                    >
                      2 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDefinirDiasPredefinidos(3)}
                      className="px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold border border-border"
                    >
                      3 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDefinirDiasPredefinidos(5)}
                      className="px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold border border-border"
                    >
                      Semana Toda (5 Dias)
                    </button>
                  </div>
                </div>

                {/* Botoeira dos Dias da Semana */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {DIAS_SEMANA.map((dia) => {
                    const selecionado = (situacaoAtual.diasAfetados || []).includes(dia)
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => handleToggleDia(dia)}
                        className={`py-1.5 px-2 rounded-xl text-center border font-bold text-xs transition-all flex flex-col items-center justify-center ${
                          selecionado
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs scale-[1.02]"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        <span className="text-[11px] font-black">{NOMES_DIAS[dia].split('-')[0]}</span>
                        <span className="text-[9px] opacity-80">{selecionado ? "✓ Ativo" : "-"}</span>
                      </button>
                    )
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground italic">
                  * Nos dias selecionados, o sistema usará esta grade de emergência. Nos dias não selecionados, o horário normal continuará funcionando.
                </span>
              </div>

              {/* Botões de Ação para o Slot */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Copiar da Oficial */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopiarOficial}
                    disabled={copiando}
                    className="h-8 px-2.5 text-xs font-bold gap-1.5 border-amber-500/40 hover:bg-amber-500/10 text-foreground"
                    title="Clona todas as aulas da grade oficial para esta emergência como base inicial"
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-600" />
                    <span>{copiando ? "Copiando..." : "Copiar da Grade Oficial"}</span>
                  </Button>

                  {/* Editar no Quadro */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleSalvarDados()
                      onAbrirEdicaoEmergencia(situacaoAtual.instanciaKey, situacaoAtual.titulo)
                      onOpenChange(false)
                    }}
                    className="h-8 px-2.5 text-xs font-bold gap-1.5"
                    title="Abre a matriz do quadro para editar ou remanejar aulas nesta situação emergencial"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                    <span>Editar no Quadro</span>
                  </Button>

                  {/* Imprimir */}
                  {onAbrirImpressaoEmergencia && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onAbrirImpressaoEmergencia(
                          situacaoAtual.instanciaKey, 
                          situacaoAtual.titulo,
                          situacaoAtual.diasAfetados,
                          situacaoAtual.motivo
                        )
                        onOpenChange(false)
                      }}
                      className="h-8 px-2.5 text-xs font-bold gap-1.5 text-foreground hover:bg-amber-500/10"
                      title="Imprimir somente as aulas desta emergência em folha A4 (sem células em branco)"
                    >
                      <Printer className="h-3.5 w-3.5 text-amber-600" />
                      <span>Imprimir Só Esta Emergência</span>
                    </Button>
                  )}

                  {/* Limpar Slot */}
                  {(situacaoAtual.totalAulas || 0) > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLimparSlot}
                      disabled={limpando}
                      className="h-8 px-2 text-xs font-bold text-red-600 hover:bg-red-500/10 hover:text-red-700"
                      title="Apaga todas as aulas deste slot de emergência"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Limpar Slot</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSalvarDados}
                    disabled={salvando}
                    className="h-8 text-xs font-bold"
                  >
                    Salvar Dados
                  </Button>

                  {/* Botão de Ativação / Desativação */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAtivarOuDesativar}
                    disabled={salvando}
                    className={`h-8 px-3.5 text-xs font-extrabold gap-1.5 shadow-sm transition-all ${
                      isSituacaoAtiva
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                  >
                    {isSituacaoAtiva ? (
                      <>
                        <XCircle className="h-4 w-4" />
                        <span>Desativar (Voltar ao Normal)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ativar como Horário Emergencial</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
