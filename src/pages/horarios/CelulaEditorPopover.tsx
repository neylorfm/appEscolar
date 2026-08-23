import { useState, useEffect, useMemo, useRef } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Trash2, AlertTriangle, BookOpen, User, Palette } from "lucide-react"
import { Disciplina } from "@/services/disciplinas"
import { PALETA_50_CORES, obterCorEfetivaProfessor, getEstiloBadgeCor } from "@/services/gradeHorarios"

interface CelulaEditorPopoverProps {
  turmaNome: string
  diaSemana: string
  diaNome: string
  numeroAula: number
  aulaRotulo: string
  disciplinaAtual?: string
  professorAtual?: string
  corAtual?: string
  mapaCoresProfessores?: Map<string, string>
  disciplinasDisponiveis: Disciplina[]
  professoresCadastrados: string[]
  temConflito?: boolean
  conflitoInfo?: string
  canEdit: boolean
  onSalvar: (disciplina: string, professor: string, cor?: string) => Promise<void>
  onLimpar: () => Promise<void>
  children: React.ReactNode
}

export function CelulaEditorPopover({
  turmaNome,
  diaNome,
  aulaRotulo,
  disciplinaAtual = "",
  professorAtual = "",
  corAtual,
  mapaCoresProfessores,
  disciplinasDisponiveis,
  professoresCadastrados = [],
  temConflito,
  conflitoInfo,
  canEdit,
  onSalvar,
  onLimpar,
  children
}: CelulaEditorPopoverProps) {
  const [open, setOpen] = useState(false)
  const [disciplinaBusca, setDisciplinaBusca] = useState(disciplinaAtual)
  const [professorBusca, setProfessorBusca] = useState(professorAtual)
  const [corSelecionada, setCorSelecionada] = useState(
    obterCorEfetivaProfessor(professorAtual, corAtual, mapaCoresProfessores)
  )
  const [saving, setSaving] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setDisciplinaBusca(disciplinaAtual)
      setProfessorBusca(professorAtual)
      setCorSelecionada(obterCorEfetivaProfessor(professorAtual, corAtual, mapaCoresProfessores))
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open, disciplinaAtual, professorAtual, corAtual, mapaCoresProfessores])

  const disciplinasFiltradas = useMemo(() => {
    const termo = disciplinaBusca.trim().toLowerCase()
    if (!termo) return disciplinasDisponiveis.slice(0, 10)
    return disciplinasDisponiveis
      .filter(d => d.nome.toLowerCase().includes(termo))
      .slice(0, 10)
  }, [disciplinasDisponiveis, disciplinaBusca])

  const professoresFiltrados = useMemo(() => {
    const termo = professorBusca.trim().toUpperCase()
    if (!termo) return professoresCadastrados.slice(0, 12)
    return professoresCadastrados
      .filter(p => p.toUpperCase().includes(termo))
      .slice(0, 12)
  }, [professoresCadastrados, professorBusca])

  const disciplinaExisteExata = useMemo(() => {
    return disciplinasDisponiveis.some(
      d => d.nome.toUpperCase().trim() === disciplinaBusca.toUpperCase().trim()
    )
  }, [disciplinasDisponiveis, disciplinaBusca])

  const professorExisteExato = useMemo(() => {
    return professoresCadastrados.some(
      p => p.toUpperCase().trim() === professorBusca.toUpperCase().trim()
    )
  }, [professoresCadastrados, professorBusca])

  async function handleConfirmar() {
    if (!disciplinaBusca.trim() || !professorBusca.trim()) {
      return
    }

    try {
      setSaving(true)
      await onSalvar(
        disciplinaBusca.trim().toUpperCase(), 
        professorBusca.trim().toUpperCase(),
        corSelecionada
      )
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleLimparAula() {
    try {
      setSaving(true)
      await onLimpar()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return <>{children}</>
  }

  const previewEstilo = getEstiloBadgeCor(corSelecionada)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-5 rounded-2xl shadow-xl border-border bg-card z-[250] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/50 pb-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {diaNome} • {aulaRotulo}
              </span>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground">
                Alocar Horário • Turma {turmaNome}
              </DialogTitle>
            </div>

            {temConflito && (
              <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/30 animate-pulse"
                title={conflitoInfo}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                Conflito
              </span>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleConfirmar(); }} className="flex flex-col gap-4 py-2">
          {/* Campo 1: Disciplina com Autocomplete e Criação Dinâmica */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Disciplina:
            </Label>
            <Input
              ref={inputRef}
              placeholder="Ex: MATEMÁTICA, HISTÓRIA..."
              value={disciplinaBusca}
              onChange={(e) => setDisciplinaBusca(e.target.value)}
              className="h-9 text-xs sm:text-sm uppercase font-semibold"
              required
            />

            {/* Sugestões de Disciplinas */}
            {disciplinasFiltradas.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                {disciplinasFiltradas.map((disc) => (
                  <button
                    key={disc.id}
                    type="button"
                    onClick={() => setDisciplinaBusca(disc.nome)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      disciplinaBusca.toUpperCase() === disc.nome.toUpperCase()
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 hover:bg-muted text-foreground/80 border-border/60"
                    }`}
                  >
                    {disc.nome}
                  </button>
                ))}
              </div>
            )}

            {/* Mensagem de Criação Dinâmica se não existir */}
            {disciplinaBusca.trim() && !disciplinaExisteExata && (
              <div className="pt-0.5">
                <span className="text-[11px] text-muted-foreground italic">
                  Nova disciplina: "{disciplinaBusca.toUpperCase().trim()}" será cadastrada automaticamente.
                </span>
              </div>
            )}
          </div>

          {/* Campo 2: Nome Único do Professor */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Nome Único do Professor(a):
            </Label>
            <Input
              placeholder="Ex: RAUL, ROBSON, SAMYA, MARCELO SILVA..."
              value={professorBusca}
              onChange={(e) => {
                const novoProf = e.target.value
                setProfessorBusca(novoProf)
                setCorSelecionada(obterCorEfetivaProfessor(novoProf, null, mapaCoresProfessores))
              }}
              className="h-9 text-xs sm:text-sm uppercase font-semibold"
              required
            />

            {/* Sugestões de Professores Cadastrados na Grade */}
            {professoresFiltrados.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                {professoresFiltrados.map((profNome) => (
                  <button
                    key={profNome}
                    type="button"
                    onClick={() => {
                      setProfessorBusca(profNome)
                      setCorSelecionada(obterCorEfetivaProfessor(profNome, null, mapaCoresProfessores))
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      professorBusca.toUpperCase() === profNome.toUpperCase()
                        ? "bg-[#7f1d1d] text-white border-[#7f1d1d]"
                        : "bg-muted/40 hover:bg-muted text-foreground/80 border-border/60"
                    }`}
                  >
                    {profNome}
                  </button>
                ))}
              </div>
            )}

            {professorBusca.trim() && !professorExisteExato && (
              <div className="pt-0.5">
                <span className="text-[11px] text-muted-foreground italic">
                  Novo professor(a) único: "{professorBusca.toUpperCase().trim()}"
                </span>
              </div>
            )}
          </div>

          {/* Campo 3: Roda de Cores e Paleta de 50 Cores do Professor */}
          <div className="grid gap-2 p-3 rounded-xl border border-border/80 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-primary" />
                Cor Exclusiva do Professor:
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {corSelecionada}
                </span>
                {/* Roda de cores nativa */}
                <input
                  type="color"
                  value={corSelecionada}
                  onChange={(e) => setCorSelecionada(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                  title="Abrir roda de cores personalizada"
                />
              </div>
            </div>

            {/* Amostras das 50 Cores da Paleta */}
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-background rounded-lg border border-border/60">
              {PALETA_50_CORES.map((hex, idx) => (
                <button
                  key={`${hex}_${idx}`}
                  type="button"
                  onClick={() => setCorSelecionada(hex)}
                  className={`w-5 h-5 rounded-md transition-transform border ${
                    corSelecionada.toLowerCase() === hex.toLowerCase()
                      ? "ring-2 ring-primary scale-110 shadow-xs"
                      : "hover:scale-105 border-black/10"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={`Cor ${idx + 1}: ${hex}`}
                />
              ))}
            </div>

            {/* Pré-visualização do Card */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-muted-foreground">Prévia na Grade:</span>
              <div
                className="px-3 py-1 rounded-md font-bold text-center border text-[10.5px] shadow-2xs"
                style={previewEstilo}
              >
                {disciplinaBusca.trim() || "DISCIPLINA"} • {professorBusca.trim() || "PROFESSOR"}
              </div>
            </div>
          </div>

          {/* Rodapé com Ações */}
          <DialogFooter className="pt-3 border-t border-border/50 flex flex-row items-center justify-between sm:justify-between w-full">
            {(disciplinaAtual || professorAtual) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLimparAula}
                disabled={saving}
                className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Aula
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !disciplinaBusca.trim() || !professorBusca.trim()}
                className="h-9 text-xs font-semibold bg-[#7f1d1d] hover:bg-[#661717] text-white gap-1.5"
              >
                <Check className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
