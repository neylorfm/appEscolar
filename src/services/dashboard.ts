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
  imagem_url?: string | null
  link?: string | null
  categoria?: string | null
  data_publicacao: string
  autor_id: string | null
  tags: string[]
  created_at: string
  updated_at?: string
}

export interface InformacaoBimestre {
  id: string
  bimestre: number // 1, 2, 3 ou 4
  titulo: string
  link?: string | null
  descricao?: string | null
  ordem: number
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
  const payload: any = {
    titulo: aviso.titulo,
    conteudo: aviso.conteudo,
    imagem_url: aviso.imagem_url ? aviso.imagem_url.trim() : null,
    link: aviso.link ? aviso.link.trim() : null,
    categoria: aviso.categoria ? aviso.categoria.trim() : 'COMUNICADO',
    tags: aviso.tags || [],
    data_publicacao: aviso.data_publicacao || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (aviso.id) {
    let { data, error } = await supabase
      .from('avisos')
      .update(payload)
      .eq('id', aviso.id)
      .select()
      .single()
    
    // Fallback se as colunas link/categoria ainda não existirem no Supabase
    if (error && (error.message.includes('link') || error.message.includes('categoria'))) {
      delete payload.link
      delete payload.categoria
      const res = await supabase
        .from('avisos')
        .update(payload)
        .eq('id', aviso.id)
        .select()
        .single()
      data = res.data
      error = res.error
    }

    if (error) {
      console.error('Erro ao atualizar aviso:', error)
      throw error
    }
    return data as Aviso
  } else {
    payload.autor_id = aviso.autor_id || null
    let { data, error } = await supabase
      .from('avisos')
      .insert([payload])
      .select()
      .single()
    
    // Fallback se as colunas link/categoria ainda não existirem no Supabase
    if (error && (error.message.includes('link') || error.message.includes('categoria'))) {
      delete payload.link
      delete payload.categoria
      const res = await supabase
        .from('avisos')
        .insert([payload])
        .select()
        .single()
      data = res.data
      error = res.error
    }

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

// Informações Bimestrais Services
export async function getInformacoesBimestre(bimestre?: number) {
  try {
    let query = supabase
      .from('bimestre_informacoes')
      .select('*')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (bimestre) {
      query = query.eq('bimestre', bimestre)
    }

    const { data, error } = await query
    
    if (error) {
      console.warn('Não foi possível carregar informações bimestrais:', error.message)
      return []
    }
    return (data as InformacaoBimestre[]) || []
  } catch (err) {
    console.error('Erro ao buscar informações bimestrais:', err)
    return []
  }
}

export async function upsertInformacaoBimestre(info: Partial<InformacaoBimestre>) {
  if (!info.bimestre || !info.titulo) {
    throw new Error("Bimestre e Título são obrigatórios")
  }

  if (info.id) {
    const { data, error } = await supabase
      .from('bimestre_informacoes')
      .update({
        bimestre: info.bimestre,
        titulo: info.titulo.trim(),
        link: info.link ? info.link.trim() : null,
        descricao: info.descricao ? info.descricao.trim() : null,
        ordem: info.ordem ?? 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', info.id)
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao atualizar informação bimestral:', error)
      throw error
    }
    return data as InformacaoBimestre
  } else {
    const { data, error } = await supabase
      .from('bimestre_informacoes')
      .insert([{
        bimestre: info.bimestre,
        titulo: info.titulo.trim(),
        link: info.link ? info.link.trim() : null,
        descricao: info.descricao ? info.descricao.trim() : null,
        ordem: info.ordem ?? 0
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao criar informação bimestral:', error)
      throw error
    }
    return data as InformacaoBimestre
  }
}

export async function deleteInformacaoBimestre(id: string) {
  const { error } = await supabase
    .from('bimestre_informacoes')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Erro ao excluir informação bimestral:', error)
    throw error
  }
}

