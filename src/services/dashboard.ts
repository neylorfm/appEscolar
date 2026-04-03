import { supabase } from "@/lib/supabase"

export interface QuickLink {
  id: string
  titulo: string
  url: string
  icone: string | null
  ordem: number
  created_at: string
}

export interface Aviso {
  id: string
  titulo: string
  conteudo: string
  data_publicacao: string
  autor_id: string | null
  tags: string[]
  created_at: string
}

// Quicklinks Services
export async function getQuickLinks() {
  const { data, error } = await supabase
    .from('quicklinks')
    .select('*')
    .order('ordem', { ascending: true })
  
  if (error) throw error
  return data as QuickLink[]
}

export async function upsertQuickLink(link: Partial<QuickLink>) {
  const { data, error } = await supabase
    .from('quicklinks')
    .upsert(link)
    .select()
    .single()
  
  if (error) throw error
  return data as QuickLink
}

export async function deleteQuickLink(id: string) {
  const { error } = await supabase
    .from('quicklinks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Avisos Services
export async function getAvisos() {
  const { data, error } = await supabase
    .from('avisos')
    .select('*')
    .order('data_publicacao', { ascending: false })
  
  if (error) throw error
  return data as Aviso[]
}

export async function upsertAviso(aviso: Partial<Aviso>) {
  const { data, error } = await supabase
    .from('avisos')
    .upsert(aviso)
    .select()
    .single()
  
  if (error) throw error
  return data as Aviso
}

export async function deleteAviso(id: string) {
  const { error } = await supabase
    .from('avisos')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}
