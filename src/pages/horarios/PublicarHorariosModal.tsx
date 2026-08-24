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
import { UploadCloud, Calendar, AlertCircle, CheckCircle2 } from "lucide-react"

interface PublicarHorariosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmarPublicacao: (textoVigencia: string) => Promise<void>
  totalAulasRascunho: number
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
  totalAulasRascunho
}: PublicarHorariosModalProps) {
  // Pega a data de hoje formatada YYYY-MM-DD para o input
  const hoje = new Date()
  const dataHojeStr = hoje.toISOString().split('T')[0]

  const [dataSelecionada, setDataSelecionada] = useState<string>(dataHojeStr)
  const [opcaoTurno, setOpcaoTurno] = useState<string>("Manhã")
  const [textoPersonalizado, setTextoPersonalizado] = useState<string>("")
  const [publicando, setPublicando] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      setDataSelecionada(new Date().toISOString().split('T')[0])
    }
  }, [open])

  // Formata a data para DD/MM/AAAA
  const dataFormatadaPt = useMemo(() => {
    if (!dataSelecionada) return ""
    const [ano, mes, dia] = dataSelecionada.split('-')
    if (!ano || !mes || !dia) return dataSelecionada
    return `${dia}/${mes}/${ano}`
  }, [dataSelecionada])

  // Turno final selecionado
  const complementoTurno = useMemo(() => {
    if (opcaoTurno === "OUTRO") {
      return textoPersonalizado.trim() || "Geral"
    }
    return opcaoTurno
  }, [opcaoTurno, textoPersonalizado])

  // Legenda de vigência final
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
      <DialogContent className="sm:max-w-[540px] p-6 rounded-2xl">
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
          {/* Card de Alerta Informativo */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>{totalAulasRascunho} aulas</strong> preparadas no rascunho serão publicadas e ficarão visíveis para todos os professores e alunos.
            </div>
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
