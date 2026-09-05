import React from "react"

interface RichTextRendererProps {
  content: string
  className?: string
  clampLines?: number
}

/**
 * Converte trechos de texto inline contendo marcadores markdown/html simples:
 * - **negrito**
 * - *itálico*
 * - <u>sublinhado</u>
 * - `código`
 * - [texto](url)
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  // Regex tokenizador que captura tokens formatados
  // 1, 2: bold (**...**)
  // 3, 4: italic (*...*)
  // 5, 6: underline (<u>...</u>)
  // 7, 8: code (`...`)
  // 9, 10, 11: link ([text](url))
  const tokenRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(<u\b[^>]*>(.*?)<\/u>)|(`([^`]+)`)|(\[(.+?)\]\(([^)]+)\))/gi

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    // Texto antes do token
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index))
    }

    const [fullMatch, , boldText, , italicText, , underlineText, , codeText, , linkLabel, linkUrl] = match

    if (boldText !== undefined) {
      nodes.push(
        <strong key={match.index} className="font-bold text-foreground">
          {boldText}
        </strong>
      )
    } else if (italicText !== undefined) {
      nodes.push(
        <em key={match.index} className="italic text-foreground/90">
          {italicText}
        </em>
      )
    } else if (underlineText !== undefined) {
      nodes.push(
        <span key={match.index} className="underline underline-offset-4 decoration-primary/70 font-medium">
          {underlineText}
        </span>
      )
    } else if (codeText !== undefined) {
      nodes.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.85em] text-primary border border-border/60">
          {codeText}
        </code>
      )
    } else if (linkLabel !== undefined && linkUrl !== undefined) {
      const cleanUrl = linkUrl.trim()
      const formattedHref = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")
        ? cleanUrl
        : `https://${cleanUrl}`

      nodes.push(
        <a
          key={match.index}
          href={formattedHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline underline-offset-2 font-semibold inline-flex items-center gap-0.5"
        >
          {linkLabel}
        </a>
      )
    } else {
      nodes.push(fullMatch)
    }

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}

export function RichTextRenderer({ content, className = "", clampLines }: RichTextRendererProps) {
  if (!content) return null

  // Se clampLines for especificado, faz uma versão resumida e limpa de quebras
  if (clampLines) {
    const previewText = content
      .replace(/^#+\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .trim()

    return (
      <div 
        className={`text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${className}`}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: clampLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
      >
        {renderInlineFormatting(previewText)}
      </div>
    )
  }

  // Divisão por linhas para blocos
  const lines = content.split(/\r?\n/)
  const elements: React.ReactNode[] = []

  let inList: "ul" | "ol" | null = null
  let listItems: React.ReactNode[] = []

  const flushList = () => {
    if (!inList) return
    const key = `list-${elements.length}`
    if (inList === "ul") {
      elements.push(
        <ul key={key} className="list-disc pl-5 space-y-1 my-2 text-foreground/90">
          {listItems}
        </ul>
      )
    } else {
      elements.push(
        <ol key={key} className="list-decimal pl-5 space-y-1 my-2 text-foreground/90">
          {listItems}
        </ol>
      )
    }
    inList = null
    listItems = []
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Linha vazia
    if (!trimmed) {
      flushList()
      elements.push(<div key={`empty-${index}`} className="h-2" />)
      return
    }

    // Título H1
    if (line.startsWith("# ")) {
      flushList()
      elements.push(
        <h1 key={`h1-${index}`} className="text-xl sm:text-2xl font-black text-foreground mt-4 mb-2">
          {renderInlineFormatting(line.replace("# ", ""))}
        </h1>
      )
      return
    }

    // Título H2
    if (line.startsWith("## ")) {
      flushList()
      elements.push(
        <h2 key={`h2-${index}`} className="text-lg sm:text-xl font-extrabold text-foreground mt-3 mb-1.5">
          {renderInlineFormatting(line.replace("## ", ""))}
        </h2>
      )
      return
    }

    // Título H3
    if (line.startsWith("### ")) {
      flushList()
      elements.push(
        <h3 key={`h3-${index}`} className="text-base sm:text-lg font-bold text-foreground mt-2 mb-1">
          {renderInlineFormatting(line.replace("### ", ""))}
        </h3>
      )
      return
    }

    // Citação / Callout
    if (line.startsWith("> ")) {
      flushList()
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-4 border-primary bg-primary/5 dark:bg-primary/10 pl-3.5 py-2 my-2 rounded-r-lg text-sm text-foreground/90 italic"
        >
          {renderInlineFormatting(line.replace("> ", ""))}
        </blockquote>
      )
      return
    }

    // Linha horizontal separadora
    if (trimmed === "---" || trimmed === "***") {
      flushList()
      elements.push(<hr key={`hr-${index}`} className="border-border my-3" />)
      return
    }

    // Item de lista não ordenada (- ou *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/)
    if (ulMatch) {
      if (inList !== "ul") {
        flushList()
        inList = "ul"
      }
      listItems.push(
        <li key={`li-ul-${index}`} className="leading-relaxed">
          {renderInlineFormatting(ulMatch[2])}
        </li>
      )
      return
    }

    // Item de lista ordenada (1. 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (olMatch) {
      if (inList !== "ol") {
        flushList()
        inList = "ol"
      }
      listItems.push(
        <li key={`li-ol-${index}`} className="leading-relaxed">
          {renderInlineFormatting(olMatch[2])}
        </li>
      )
      return
    }

    // Parágrafo regular
    flushList()
    elements.push(
      <p key={`p-${index}`} className="leading-relaxed text-sm sm:text-base text-foreground/90 my-1">
        {renderInlineFormatting(line)}
      </p>
    )
  })

  flushList()

  return (
    <div className={`space-y-1 text-foreground ${className}`}>
      {elements}
    </div>
  )
}
