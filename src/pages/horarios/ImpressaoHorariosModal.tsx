import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, FileText, User, Calendar } from "lucide-react"

interface ImpressaoHorariosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professoresCadastrados: string[]
  textoVigencia: string
  onConfirmarImpressao: (modo: "TODOS" | "PROFESSOR", professorEscolhido?: string) => void
}

export function ImpressaoHorariosModal({
  open,
  onOpenChange,
  professoresCadastrados,
  textoVigencia,
  onConfirmarImpressao,
}: ImpressaoHorariosModalProps) {
  const [modo, setModo] = useState<"TODOS" | "PROFESSOR">("TODOS")
  const [professorEscolhido, setProfessorEscolhido] = useState(
    professoresCadastrados[0] || ""
  )

  function handleImprimir() {
    onConfirmarImpressao(modo, modo === "PROFESSOR" ? professorEscolhido : undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 rounded-2xl shadow-2xl border-border bg-card z-[250]">
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
                Selecione o formato desejado para impressão ou exportação.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Opção 1: Seleção do Modo */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setModo("TODOS")}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                modo === "TODOS"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <FileText className="h-4 w-4" />
                <span>Todos os Horários</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-snug">
                Gera 3 páginas (Pág 1: Manhã, Pág 2: Tarde, Pág 3: Noite).
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModo("PROFESSOR")}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                modo === "PROFESSOR"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <User className="h-4 w-4" />
                <span>Por Professor</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-snug">
                Gera 1 página com a agenda semanal de um docente específico.
              </span>
            </button>
          </div>

          {/* Se for por Professor: Escolha do Docente */}
          {modo === "PROFESSOR" && (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-muted/20 animate-in fade-in">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Escolha o Professor(a):
              </Label>
              <Select value={professorEscolhido} onValueChange={setProfessorEscolhido}>
                <SelectTrigger className="h-9 text-xs font-bold uppercase">
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent className="max-h-56 z-[300]">
                  {professoresCadastrados.map((prof) => (
                    <SelectItem key={prof} value={prof} className="font-bold uppercase text-xs">
                      {prof}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Informação de Vigência do Documento (Somente Leitura na Impressão) */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/80 bg-muted/30">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Vigência no Cabeçalho das Páginas:
              </span>
              <span className="text-xs font-extrabold text-foreground">
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
            className="h-9 text-xs font-bold bg-[#7f1d1d] hover:bg-[#661717] text-white gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
