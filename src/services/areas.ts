import { supabase } from '@/lib/supabase'

export interface Area {
  id: string
  nome: string
  pcas: string[]
  created_at: string
  updated_at?: string
}

export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar áreas:', error)
    throw new Error('Não foi possível carregar as áreas.')
  }

  return data as Area[]
}

export async function criarArea(nome: string, pcas: string[] = []) {
  const { data, error } = await supabase
    .from('areas')
    .insert([{ nome: nome.trim(), pcas }])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar área:', error)
    if (error.code === '23505') {
      throw new Error(`A área "${nome}" já existe.`)
    }
    throw new Error('Não foi possível criar a área.')
  }

  return data as Area
}

export async function atualizarArea(id: string, nome: string, pcas: string[]) {
  const { data, error } = await supabase
    .from('areas')
    .update({ 
      nome: nome.trim(), 
      pcas,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar área:', error)
    if (error.code === '23505') {
      throw new Error(`A área "${nome}" já existe.`)
    }
    throw new Error('Não foi possível atualizar a área.')
  }

  return data as Area
}

export async function deletarArea(id: string) {
  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir área:', error)
    throw new Error('Não foi possível excluir a área.')
  }
}
