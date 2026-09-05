import { supabase } from "@/lib/supabase"

export interface Tutorial {
  id: string
  titulo: string
  conteudo: string
  link?: string | null
  ordem?: number
  autor_id?: string | null
  created_at: string
  updated_at?: string
}

/**
 * Extrai o ID de um vídeo do YouTube a partir de múltiplos formatos de URL:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function getYoutubeVideoId(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  const match = trimmed.match(regExp)
  return match ? match[1] : null
}

/**
 * Retorna se a URL fornecida é um vídeo válido do YouTube.
 */
export function isYoutubeUrl(url?: string | null): boolean {
  return Boolean(getYoutubeVideoId(url))
}

/**
 * Retorna a URL da miniatura do YouTube servida pela CDN global da Google (zero custo de storage).
 */
export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * Retorna a URL de incorporação (embed) seguro do YouTube sem cookies de terceiros.
 */
export function getYoutubeEmbedUrl(videoId: string, autoplay = true): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`
}

/**
 * Garante que a URL possua o protocolo https:// caso o usuário digite sem.
 */
export function formatarUrl(url?: string | null): string {
  if (!url) return ""
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  return `https://${trimmed}`
}

/**
 * Busca a lista de tutoriais cadastrados ordenada por ordem e data de criação.
 */
export async function getTutoriais(): Promise<Tutorial[]> {
  try {
    const { data, error } = await supabase
      .from("tutoriais")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Não foi possível carregar tutoriais (verifique a tabela no Supabase):", error.message)
      return []
    }
    return (data as Tutorial[]) || []
  } catch (err) {
    console.error("Erro ao buscar tutoriais:", err)
    return []
  }
}

/**
 * Cria ou atualiza um tutorial.
 */
export async function upsertTutorial(tutorial: Partial<Tutorial>): Promise<Tutorial> {
  const payload = {
    titulo: tutorial.titulo?.trim(),
    conteudo: tutorial.conteudo?.trim(),
    link: tutorial.link ? formatarUrl(tutorial.link) : null,
    ordem: tutorial.ordem ?? 0,
    autor_id: tutorial.autor_id,
    updated_at: new Date().toISOString()
  }

  if (tutorial.id) {
    const { data, error } = await supabase
      .from("tutoriais")
      .update(payload)
      .eq("id", tutorial.id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar tutorial:", error)
      throw error
    }
    return data as Tutorial
  } else {
    const { data, error } = await supabase
      .from("tutoriais")
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar tutorial:", error)
      throw error
    }
    return data as Tutorial
  }
}

/**
 * Exclui um tutorial pelo ID.
 */
export async function deleteTutorial(id: string): Promise<void> {
  const { error } = await supabase
    .from("tutoriais")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Erro ao excluir tutorial:", error)
    throw error
  }
}

/**
 * Reordena múltiplos tutoriais salvando a nova ordem sequencial.
 */
export async function reordenarTutoriais(tutoriais: Tutorial[]): Promise<void> {
  try {
    const updates = tutoriais.map((tutorial, index) => 
      supabase
        .from("tutoriais")
        .update({ ordem: index, updated_at: new Date().toISOString() })
        .eq("id", tutorial.id)
    )

    await Promise.all(updates)
  } catch (err) {
    console.error("Erro ao reordenar tutoriais:", err)
    throw err
  }
}
