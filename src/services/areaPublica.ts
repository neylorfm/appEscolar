import { supabase } from "@/lib/supabase"

export interface AvisoPublico {
  id: string
  titulo: string
  conteudo: string
  imagem_url?: string | null
  link?: string | null
  categoria?: string | null
  ordem?: number
  data_publicacao: string
  autor_id: string | null
  tags: string[]
  created_at: string
  updated_at?: string
}

// Chave e tempo de cache para economia extrema no Supabase Free Tier (6 horas no localStorage)
const CACHE_KEY = 'app_escolar_area_publica_v1_cache'
const CACHE_TIME_KEY = 'app_escolar_area_publica_v1_time'
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000 // 6 horas de persistência

/**
 * Busca avisos da Área Pública com estratégia de cache persistente no localStorage.
 * Ideal para informações de baixa frequência de atualização (semanal / mensal / diária),
 * poupando até 99% das consultas e transferência de dados da cota gratuita do Supabase.
 */
export async function getAvisosPublicos(forceRefresh = false): Promise<AvisoPublico[]> {
  try {
    // 1. Verifica cache no localStorage se não for forceRefresh
    if (!forceRefresh) {
      try {
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY)
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedTime && cachedData) {
          const age = Date.now() - Number(cachedTime)
          if (age < CACHE_DURATION_MS) {
            return JSON.parse(cachedData) as AvisoPublico[]
          }
        }
      } catch {}
    }

    // 2. Consulta no Supabase
    let { data, error } = await supabase
      .from('avisos_publicos')
      .select('id, titulo, conteudo, imagem_url, link, categoria, ordem, data_publicacao, autor_id, tags, created_at, updated_at')
      .order('ordem', { ascending: true })
      .order('data_publicacao', { ascending: false })
      .limit(50)

    // Fallback se a coluna ordem não existir
    if (error && error.message.includes('ordem')) {
      const res = await supabase
        .from('avisos_publicos')
        .select('*')
        .order('data_publicacao', { ascending: false })
        .limit(50)
      data = res.data
      error = res.error
    }

    if (error) {
      console.warn('Não foi possível carregar avisos da Área Pública:', error.message)
      // Se der erro de rede mas houver cache expirado, entrega o cache como fallback
      try {
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedData) return JSON.parse(cachedData) as AvisoPublico[]
      } catch {}
      return []
    }

    const lista = (data as AvisoPublico[]) || []

    // 3. Salva no cache persistente do navegador
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(lista))
      localStorage.setItem(CACHE_TIME_KEY, String(Date.now()))
    } catch {}

    return lista
  } catch (err) {
    console.error('Erro ao buscar avisos da Área Pública:', err)
    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (cachedData) return JSON.parse(cachedData) as AvisoPublico[]
    } catch {}
    return []
  }
}

/**
 * Limpa o cache local da Área Pública (chamado após cadastros/edições/exclusões)
 */
export function limparCacheAreaPublica() {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_TIME_KEY)
  } catch {}
}

/**
 * Cria ou atualiza um comunicado na Área Pública (Admin / Coordenador)
 */
export async function upsertAvisoPublico(aviso: Partial<AvisoPublico>): Promise<AvisoPublico> {
  limparCacheAreaPublica()

  const payload: any = {
    titulo: aviso.titulo?.trim(),
    conteudo: aviso.conteudo?.trim(),
    imagem_url: aviso.imagem_url ? aviso.imagem_url.trim() : null,
    link: aviso.link ? aviso.link.trim() : null,
    categoria: aviso.categoria ? aviso.categoria.trim() : 'COMUNICADO',
    ordem: aviso.ordem ?? 0,
    tags: aviso.tags || [],
    data_publicacao: aviso.data_publicacao || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (aviso.id) {
    const { data, error } = await supabase
      .from('avisos_publicos')
      .update(payload)
      .eq('id', aviso.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar aviso na Área Pública:', error)
      throw error
    }
    return data as AvisoPublico
  } else {
    payload.autor_id = aviso.autor_id || null
    const { data, error } = await supabase
      .from('avisos_publicos')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar aviso na Área Pública:', error)
      throw error
    }
    return data as AvisoPublico
  }
}

/**
 * Reordena os avisos da Área Pública
 */
export async function reordenarAvisosPublicos(novosAvisos: AvisoPublico[]) {
  limparCacheAreaPublica()
  try {
    const promises = novosAvisos.map((aviso, idx) => 
      supabase
        .from('avisos_publicos')
        .update({ 
          ordem: idx + 1,
          updated_at: new Date().toISOString() 
        })
        .eq('id', aviso.id)
    )
    await Promise.all(promises)
  } catch (error) {
    console.error('Erro ao salvar nova ordem dos avisos da Área Pública:', error)
  }
}

/**
 * Exclui um aviso da Área Pública
 */
export async function deleteAvisoPublico(id: string) {
  limparCacheAreaPublica()
  const { error } = await supabase
    .from('avisos_publicos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir aviso da Área Pública:', error)
    throw error
  }
}
