import { useRef, useState } from "react"
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Eye, 
  Edit3,
  HelpCircle,
  ExternalLink,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RichTextRenderer } from "./RichTextRenderer"
import { toast } from "sonner"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  id?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Descreva as instruções do tutorial...",
  rows = 8,
  className = "",
  id = "tutorial-conteudo"
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Estado da Janela Modal de Inserção de Link
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkText, setLinkText] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [savedSelection, setSavedSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 })

  /**
   * Envelopa o texto selecionado com tags inline (negrito, itálico, sublinhado, código).
   * Se houver texto selecionado, coloca as tags ao redor desse texto e mantém a seleção.
   */
  function applyInlineFormatting(prefix: string, suffix = "", defaultText = "texto") {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const hasSelection = start !== end
    const selectedText = value.substring(start, end)
    const textToInsert = hasSelection ? selectedText : defaultText

    const newContent = 
      value.substring(0, start) + 
      prefix + 
      textToInsert + 
      suffix + 
      value.substring(end)

    onChange(newContent)

    setTimeout(() => {
      textarea.focus()
      if (hasSelection) {
        // Mantém todo o trecho formatado em seleção
        textarea.setSelectionRange(start, start + prefix.length + textToInsert.length + suffix.length)
      } else {
        // Posiciona cursor dentro das tags
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + textToInsert.length
        )
      }
    }, 10)
  }

  /**
   * Aplica formatação de bloco (H1, H2, Lista com marcadores, Lista numerada, Citação).
   * Se houver texto selecionado, insere o prefixo no início de cada linha/parágrafo selecionado!
   */
  function applyBlockFormatting(type: "h1" | "h2" | "ul" | "ol" | "quote") {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const hasSelection = start !== end

    // Se NÃO houver seleção, insere um modelo no cursor
    if (!hasSelection) {
      const templates = {
        h1: "# Título Principal",
        h2: "## Subtítulo",
        ul: "- Item com marcador",
        ol: "1. Primeiro passo",
        quote: "> Destaque ou instrução pedagógica"
      }
      const defaultText = templates[type]
      const beforeCursor = value.substring(0, start)
      const afterCursor = value.substring(start)

      const needsNewLine = beforeCursor.length > 0 && !beforeCursor.endsWith("\n")
      const insertion = (needsNewLine ? "\n" : "") + defaultText + "\n"

      onChange(beforeCursor + insertion + afterCursor)

      setTimeout(() => {
        textarea.focus()
        const cursorPos = start + (needsNewLine ? 1 : 0) + defaultText.length
        textarea.setSelectionRange(cursorPos, cursorPos)
      }, 10)
      return
    }

    // SE HOUVER SELEÇÃO: Encontra o início da primeira linha e fim da última linha selecionada
    const lineStart = value.lastIndexOf("\n", start - 1) + 1
    let lineEnd = value.indexOf("\n", end)
    if (lineEnd === -1) lineEnd = value.length

    const selectedBlock = value.substring(lineStart, lineEnd)
    const lines = selectedBlock.split("\n")

    const formattedLines = lines.map((line, idx) => {
      // Remove prefixos de blocos existentes para não acumular (# # - 1.)
      const cleanLine = line.replace(/^(#+\s*|[-*]\s*|\d+\.\s*|>\s*)/, "")

      switch (type) {
        case "h1":
          return `# ${cleanLine}`
        case "h2":
          return `## ${cleanLine}`
        case "ul":
          return `- ${cleanLine}`
        case "ol":
          return `${idx + 1}. ${cleanLine}`
        case "quote":
          return `> ${cleanLine}`
        default:
          return cleanLine
      }
    })

    const newBlock = formattedLines.join("\n")
    const newContent = value.substring(0, lineStart) + newBlock + value.substring(lineEnd)

    onChange(newContent)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newBlock.length)
    }, 10)
  }

  /**
   * Abre a janela dedicada (Modal) para inserir link na seleção de texto.
   */
  function handleOpenLinkModal() {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.substring(start, end)

    setSavedSelection({ start, end })
    setLinkText(selected)
    setLinkUrl("")
    setIsLinkModalOpen(true)
  }

  /**
   * Aplica o link montado na janela modal ao texto.
   */
  function handleConfirmLink(e: React.FormEvent) {
    e.preventDefault()

    if (!linkUrl.trim()) {
      toast.error("Por favor, digite ou cole a URL de destino do link.")
      return
    }

    let urlFinal = linkUrl.trim()
    if (!urlFinal.startsWith("http://") && !urlFinal.startsWith("https://")) {
      urlFinal = `https://${urlFinal}`
    }

    const labelFinal = linkText.trim() || urlFinal
    const markdownLink = `[${labelFinal}](${urlFinal})`

    const newContent = 
      value.substring(0, savedSelection.start) + 
      markdownLink + 
      value.substring(savedSelection.end)

    onChange(newContent)
    setIsLinkModalOpen(false)

    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.focus()
        const newPos = savedSelection.start + markdownLink.length
        textarea.setSelectionRange(newPos, newPos)
      }
    }, 10)

    toast.success("Link inserido com sucesso!")
  }

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden shadow-2xs ${className}`}>
      {/* Barra de Ferramentas Superior */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-muted/40 border-b border-border">
        {/* Controles de Formatação */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Negrito */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormatting("**", "**", "texto em negrito")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Negrito (**texto**)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          {/* Itálico */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormatting("*", "*", "texto em itálico")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Itálico (*texto*)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          {/* Sublinhado: coloca as tags <u> entre o texto selecionado */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormatting("<u>", "</u>", "texto sublinhado")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Sublinhado (<u>texto</u>)"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>

          <div className="w-[1px] h-4 bg-border mx-1" />

          {/* Título H1: coloca # no início dos parágrafos selecionados */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBlockFormatting("h1")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Título H1 (# Início do parágrafo)"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </Button>

          {/* Subtítulo H2: coloca ## no início dos parágrafos selecionados */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBlockFormatting("h2")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Subtítulo H2 (## Início do parágrafo)"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>

          <div className="w-[1px] h-4 bg-border mx-1" />

          {/* Lista com Marcadores: coloca - no início de cada linha selecionada */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBlockFormatting("ul")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Lista com marcadores (- início das linhas)"
          >
            <List className="h-3.5 w-3.5" />
          </Button>

          {/* Lista Numerada: coloca 1., 2. no início de cada linha selecionada */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBlockFormatting("ol")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Lista numerada (1., 2. início das linhas)"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>

          {/* Citação / Destaque: coloca > no início de cada linha selecionada */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBlockFormatting("quote")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Citação / Destaque (> início das linhas)"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>

          {/* Código em Linha */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormatting("`", "`", "código")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Código em linha (`código`)"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>

          {/* Inserir Link: Abre janela dedicada permitindo aplicar à seleção */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenLinkModal}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Inserir Link na seleção ([texto](url))"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Alternador Escrever / Prévia */}
        <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/80">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "write" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("write")}
            className="h-6 px-2 text-xs font-semibold gap-1 rounded-md"
          >
            <Edit3 className="h-3 w-3" />
            <span>Escrever</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "preview" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("preview")}
            className="h-6 px-2 text-xs font-semibold gap-1 rounded-md"
          >
            <Eye className="h-3 w-3" />
            <span>Prévia</span>
          </Button>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div className="p-3">
        {activeTab === "write" ? (
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full text-sm font-sans resize-y border-0 focus-visible:ring-0 p-0 shadow-none leading-relaxed bg-transparent"
          />
        ) : (
          <div className="min-h-[160px] p-2 bg-muted/15 rounded-lg border border-border/60 overflow-y-auto max-h-[320px]">
            {value.trim() ? (
              <RichTextRenderer content={value} />
            ) : (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                Nenhum texto inserido para visualização. Escreva algo na aba "Escrever" para conferir a formatação.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dica de Formatação no Rodapé */}
      <div className="px-3 py-1.5 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <HelpCircle className="h-3 w-3 text-muted-foreground/70" />
          Selecione o texto e clique nas opções acima para aplicar formatação, títulos, listas ou links.
        </span>
        <span>{value.length} caracteres</span>
      </div>

      {/* JANELA MODAL PARA INSERÇÃO DE LINK */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md p-5 rounded-2xl">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ExternalLink className="h-4 w-4" />
              </div>
              <span>Inserir Link no Texto</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmLink} className="space-y-3.5 py-2">
            {/* Texto de Exibição */}
            <div className="space-y-1.5">
              <Label htmlFor="link-text-input" className="text-xs font-bold uppercase tracking-wider">
                Texto de Exibição (Rótulo)
              </Label>
              <Input
                id="link-text-input"
                placeholder="Ex: Clique aqui, Portal da Escola, etc."
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                {linkText 
                  ? "Este é o texto que os usuários verão como link clicável." 
                  : "Se deixar em branco, a própria URL será exibida como texto."}
              </p>
            </div>

            {/* URL de Destino */}
            <div className="space-y-1.5">
              <Label htmlFor="link-url-input" className="text-xs font-bold uppercase tracking-wider">
                URL de Destino *
              </Label>
              <Input
                id="link-url-input"
                placeholder="https://exemplo.com.br ou drive.google.com/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
                autoFocus
                className="h-9 text-sm font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Cole a URL completa. Se não incluir https://, nós adicionaremos automaticamente.
              </p>
            </div>

            <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLinkModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#7f1d1d] hover:bg-[#661717] text-white font-bold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Aplicar Link</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
