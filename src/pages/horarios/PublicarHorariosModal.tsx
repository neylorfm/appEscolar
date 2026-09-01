import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  UploadCloud, 
  Calendar, 
  GitCompare, 
  ArrowRight, 
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { GradeHorarioItem, getGradeHorarios, normalizarNomeTurma } from "@/services/gradeHorarios"

interface PublicarHorariosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmarPublicacao: (textoVigencia: string) => Promise<void>
  totalAulasRascunho: number
  itensRascunho?: GradeHorarioItem[]
}

export interface DiferencaItem {
  tipo: "NOVA" | "ALTERADA" | "REMOVIDA"
  dia: string
  aula: number
  turma: string
  de?: { disciplina: string; professor: string }
  para?: { disciplina: string; professor: string }
}

const OPCOES_TURNO_VIGENCIA = [
  { valor: "Geral", rotulo: "Geral (Todos os Turnos)" },
  { valor: "Manhã", rotulo: "Manhã" },
  { valor: "Tarde", rotulo: "Tarde" },
  { valor: "Noite", rotulo: "Noite" },
  { valor: "Integral", rotulo: "Integral (Manhã e Tarde)" },
  { valor: "1º Bimestre", rotulo: "1º Bimestre" },
  { valor: "2º Bimestre", rotulo: "2º Bimestre" },
  { valor: "3º Bimestre", rotulo: "3º Bimestre" },
  { valor: "4º Bimestre", rotulo: "4º Bimestre" },
  { valor: "OUTRO", rotulo: "Outro / Personalizado..." },
]

export function PublicarHorariosModal({
  open,
  onOpenChange,
  onConfirmarPublicacao,
  totalAulasRascunho,
  itensRascunho = []
}: PublicarHorariosModalProps) {
  const hoje = new Date()
  const dataHojeStr = hoje.toISOString().split('T')[0]

  const [dataSelecionada, setDataSelecionada] = useState<string>(dataHojeStr)
  const [opcaoTurno, setOpcaoTurno] = useState<string>("Manhã")
  const [textoPersonalizado, setTextoPersonalizado] = useState<string>("")
  const [publicando, setPublicando] = useState<boolean>(false)
  const [itensPublicados, setItensPublicados] = useState<GradeHorarioItem[]>([])
  const [carregandoDiff, setCarregandoDiff] = useState<boolean>(false)
  const [diffExpandido, setDiffExpandido] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      setDataSelecionada(new Date().toISOString().split('T')[0])
      carregarPublicados()
    }
  }, [open])

  async function carregarPublicados() {
    try {
      setCarregandoDiff(true)
      const data = await getGradeHorarios(undefined, "PUBLICADA")
      setItensPublicados(data)
    } catch (err) {
      console.warn("Erro ao carregar itens publicados para diff:", err)
    } finally {
      setCarregandoDiff(false)
    }
  }

  // Motor de Cálculo de Diferenças (Diff Engine)
  const diferencas = useMemo(() => {
    const mapaPub = new Map<string, GradeHorarioItem>()
    for (const item of itensPublicados) {
      mapaPub.set(`${item.dia_semana}_${item.numero_aula}_${normalizarNomeTurma(item.turma_nome)}`, item)
    }

    const mapaRasc = new Map<string, GradeHorarioItem>()
    for (const item of itensRascunho) {
      mapaRasc.set(`${item.dia_semana}_${item.numero_aula}_${normalizarNomeTurma(item.turma_nome)}`, item)
    }

    const resultado: DiferencaItem[] = []
    let inalteradas = 0

    // Verifica adições e modificações
    for (const [chave, itemR] of mapaRasc.entries()) {
      const itemP = mapaPub.get(chave)
      if (!itemP) {
        resultado.push({
          tipo: "NOVA",
          dia: itemR.dia_semana,
          aula: itemR.numero_aula,
          turma: itemR.turma_nome,
          para: { disciplina: itemR.disciplina_nome, professor: itemR.professor_nome }
        })
      } else {
        const discMudou = itemP.disciplina_nome.toUpperCase().trim() !== itemR.disciplina_nome.toUpperCase().trim()
        const profMudou = itemP.professor_nome.toUpperCase().trim() !== itemR.professor_nome.toUpperCase().trim()

        if (discMudou || profMudou) {
          resultado.push({
            tipo: "ALTERADA",
            dia: itemR.dia_semana,
            aula: itemR.numero_aula,
            turma: itemR.turma_nome,
            de: { disciplina: itemP.disciplina_nome, professor: itemP.professor_nome },
            para: { disciplina: itemR.disciplina_nome, professor: itemR.professor_nome }
          })
        } else {
          inalteradas++
        }
      }
    }

    // Verifica remoções
    for (const [chave, itemP] of mapaPub.entries()) {
      if (!mapaRasc.has(chave)) {
        resultado.push({
          tipo: "REMOVIDA",
          dia: itemP.dia_semana,
          aula: itemP.numero_aula,
          turma: itemP.turma_nome,
          de: { disciplina: itemP.disciplina_nome, professor: itemP.professor_nome }
        })
      }
    }

    const novas = resultado.filter(r => r.tipo === "NOVA")
    const alteradas = resultado.filter(r => r.tipo === "ALTERADA")
    const removidas = resultado.filter(r => r.tipo === "REMOVIDA")

    return {
      lista: resultado,
      novasCount: novas.length,
      alteradasCount: alteradas.length,
      removidasCount: removidas.length,
      inalteradasCount: inalteradas,
      totalAlteracoes: resultado.length
    }
  }, [itensPublicados, itensRascunho])

  const dataFormatadaPt = useMemo(() => {
    if (!dataSelecionada) return ""
    const [ano, mes, dia] = dataSelecionada.split('-')
    if (!ano || !mes || !dia) return dataSelecionada
    return `${dia}/${mes}/${ano}`
  }, [dataSelecionada])

  const complementoTurno = useMemo(() => {
    if (opcaoTurno === "OUTRO") {
      return textoPersonalizado.trim() || "Geral"
    }
    return opcaoTurno
  }, [opcaoTurno, textoPersonalizado])

  const legendaFinal = useMemo(() => {
    const dataTxt = dataFormatadaPt || "dd/mm/aaaa"
    return `Válido a partir de ${dataTxt} • ${complementoTurno}`
  }, [dataFormatadaPt, complementoTurno])

  async function handlePublicar() {
    try {
      setPublicando(true)
      await onConfirmarPublicacao(legendaFinal)
      onOpenChange(false)
    } finally {
      setPublicando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground">
                Publicar Quadro de Horários
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Disponibilize as alterações da instância de edição para a visualização oficial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Card de Resumo de Alterações (Diff Preview - Fase 2) */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-muted/40 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="text-xs font-black text-foreground uppercase tracking-wide">
                    Comparador de Alterações
                  </span>
                  <span className="text-[10px] text-muted-foreground block font-semibold">
                    {totalAulasRascunho} aulas preparadas no rascunho
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDiffExpandido(prev => !prev)}
                className="h-6 px-2 text-[11px] font-bold gap-1 text-muted-foreground hover:text-foreground"
              >
                <span>{diffExpandido ? "Recolher Detalhes" : "Ver Detalhes"}</span>
                {diffExpandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>

            {/* Badges de Contagem de Alterações */}
            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                <span className="text-[10px] font-bold uppercase block text-emerald-700 dark:text-emerald-300">Novas</span>
                <span className="text-base font-black">+{diferencas.novasCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200">
                <span className="text-[10px] font-bold uppercase block text-amber-700 dark:text-amber-300">Alteradas</span>
                <span className="text-base font-black">~{diferencas.alteradasCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-950 dark:text-red-200">
                <span className="text-[10px] font-bold uppercase block text-red-700 dark:text-red-300">Removidas</span>
                <span className="text-base font-black">-{diferencas.removidasCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border text-foreground">
                <span className="text-[10px] font-bold uppercase block text-muted-foreground">Inalteradas</span>
                <span className="text-base font-black">{diferencas.inalteradasCount}</span>
              </div>
            </div>

            {/* Lista Detalhada Expansível */}
            {diffExpandido && (
              <div className="border-t border-border/80 p-3 max-h-48 overflow-y-auto space-y-1.5 bg-muted/20 text-xs">
                {carregandoDiff ? (
                  <div className="py-4 text-center text-muted-foreground text-xs">
                    Comparando dados...
                  </div>
                ) : diferencas.lista.length === 0 ? (
                  <div className="py-3 text-center text-muted-foreground text-xs">
                    Nenhuma alteração detectada em relação à grade em vigor.
                  </div>
                ) : (
                  diferencas.lista.map((item, idx) => (
                    <div
                      key={`${item.dia}_${item.aula}_${item.turma}_${idx}`}
                      className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg bg-card border border-border/70 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        {item.tipo === "NOVA" && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-black text-[9px]">
                            NOVA
                          </span>
                        )}
                        {item.tipo === "ALTERADA" && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white font-black text-[9px]">
                            ALTERADA
                          </span>
                        )}
                        {item.tipo === "REMOVIDA" && (
                          <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-black text-[9px]">
                            REMOVIDA
                          </span>
                        )}
                        <span className="font-extrabold text-foreground">
                          {item.turma} • {item.dia} {item.aula}ª Aula:
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-right truncate">
                        {item.tipo === "NOVA" && (
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold truncate">
                            {item.para?.disciplina} ({item.para?.professor})
                          </span>
                        )}
                        {item.tipo === "ALTERADA" && (
                          <span className="flex items-center gap-1 text-muted-foreground truncate">
                            <span className="line-through text-red-600/80 truncate">{item.de?.disciplina} ({item.de?.professor})</span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-foreground" />
                            <span className="text-amber-700 dark:text-amber-300 font-bold truncate">{item.para?.disciplina} ({item.para?.professor})</span>
                          </span>
                        )}
                        {item.tipo === "REMOVIDA" && (
                          <span className="text-red-600 dark:text-red-400 line-through font-semibold truncate">
                            {item.de?.disciplina} ({item.de?.professor})
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo 1: Data de Início */}
            <div className="space-y-1.5">
              <Label htmlFor="data-vigencia" className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Data de Início da Vigência
              </Label>
              <Input
                id="data-vigencia"
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="h-9 text-xs font-semibold"
              />
            </div>

            {/* Campo 2: Turno / Complemento */}
            <div className="space-y-1.5">
              <Label htmlFor="turno-vigencia" className="text-xs font-bold">
                Turno / Segmento da Vigência
              </Label>
              <Select value={opcaoTurno} onValueChange={setOpcaoTurno}>
                <SelectTrigger id="turno-vigencia" className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_TURNO_VIGENCIA.map((opt) => (
                    <SelectItem key={opt.valor} value={opt.valor} className="text-xs">
                      {opt.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campo Extra caso selecione Personalizado */}
          {opcaoTurno === "OUTRO" && (
            <div className="space-y-1.5">
              <Label htmlFor="texto-custom" className="text-xs font-bold">
                Descrição Personalizada do Turno/Período
              </Label>
              <Input
                id="texto-custom"
                placeholder="Ex: Turno Integral • Versão 2"
                value={textoPersonalizado}
                onChange={(e) => setTextoPersonalizado(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Prévia da Legenda Formatada */}
          <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Prévia da Legenda de Vigência:
            </span>
            <div className="text-sm font-black text-foreground bg-card p-2.5 rounded-lg border border-border/80 shadow-2xs font-mono">
              {legendaFinal}
            </div>
            <span className="text-[10px] text-muted-foreground block pt-0.5">
              Esta legenda será exibida no topo do quadro na tela e em todas as impressões oficiais.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={publicando}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handlePublicar}
            disabled={publicando || !dataSelecionada}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
          >
            {publicando ? (
              <span>Publicando...</span>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                <span>Confirmar e Publicar</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
