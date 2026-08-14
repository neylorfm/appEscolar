import { supabase } from "@/lib/supabase"

export interface QuickLink {
  id: string
  titulo: string
  url: string
  icone: string | null
  ordem: number
  created_at: string
  updated_at?: string
}

export interface Aviso {
  id: string
  titulo: string
  conteudo: string
  data_publicacao: string
  autor_id: string | null
  tags: string[]
  created_at: string
  updated_at?: string
}

// Quicklinks Services
export async function getQuickLinks() {
  try {
    const { data, error } = await supabase
      .from('quicklinks')
      .select('*')
      .order('ordem', { ascending: true })
    
    if (error) {
      console.warn('Não foi possível carregar quicklinks (verifique se a tabela foi criada no Supabase):', error.message)
      return []
    }
    return (data as QuickLink[]) || []
  } catch (err) {
    console.error('Erro ao buscar quicklinks:', err)
    return []
  }
}

export async function upsertQuickLink(link: Partial<QuickLink>) {
  if (link.id) {
    const { data, error } = await supabase
      .from('quicklinks')
      .update({
        titulo: link.titulo,
        url: link.url,
        icone: link.icone || 'ExternalLink',
        ordem: link.ordem ?? 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', link.id)
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao atualizar quicklink:', error)
      throw error
    }
    return data as QuickLink
  } else {
    const { data, error } = await supabase
      .from('quicklinks')
      .insert([{
        titulo: link.titulo,
        url: link.url,
        icone: link.icone || 'ExternalLink',
        ordem: link.ordem ?? 0
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao criar quicklink:', error)
      throw error
    }
    return data as QuickLink
  }
}

export async function deleteQuickLink(id: string) {
  const { error } = await supabase
    .from('quicklinks')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Erro ao excluir quicklink:', error)
    throw error
  }
}

// Avisos Services
export async function getAvisos() {
  try {
    const { data, error } = await supabase
      .from('avisos')
      .select('*')
      .order('data_publicacao', { ascending: false })
    
    if (error) {
      console.warn('Não foi possível carregar avisos (verifique se a tabela foi criada no Supabase):', error.message)
      return []
    }
    return (data as Aviso[]) || []
  } catch (err) {
    console.error('Erro ao buscar avisos:', err)
    return []
  }
}

export async function upsertAviso(aviso: Partial<Aviso>) {
  if (aviso.id) {
    const { data, error } = await supabase
      .from('avisos')
      .update({
        titulo: aviso.titulo,
        conteudo: aviso.conteudo,
        tags: aviso.tags || [],
        data_publicacao: aviso.data_publicacao || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', aviso.id)
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao atualizar aviso:', error)
      throw error
    }
    return data as Aviso
  } else {
    const { data, error } = await supabase
      .from('avisos')
      .insert([{
        titulo: aviso.titulo,
        conteudo: aviso.conteudo,
        autor_id: aviso.autor_id || null,
        tags: aviso.tags || [],
        data_publicacao: aviso.data_publicacao || new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao criar aviso:', error)
      throw error
    }
    return data as Aviso
  }
}

export async function deleteAviso(id: string) {
  const { error } = await supabase
    .from('avisos')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Erro ao excluir aviso:', error)
    throw error
  }
}

