import { supabase } from '@/lib/supabase'

export interface Recurso {
  id: string
  nome: string
  icone: string
  detalhes: string | null
  ativo: boolean
  created_at: string
  updated_at?: string
}

export async function getRecursos() {
  const { data, error } = await supabase
    .from('recursos')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar recursos:', error)
    throw new Error('Não foi possível carregar os recursos.')
  }

  return data as Recurso[]
}

export async function criarRecurso(recurso: Omit<Recurso, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('recursos')
    .insert([recurso])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar recurso:', error)
    throw new Error('Não foi possível criar o recurso.')
  }

  return data as Recurso
}

export async function atualizarRecurso(id: string, updates: Partial<Omit<Recurso, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('recursos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar recurso:', error)
    throw new Error('Não foi possível atualizar o recurso.')
  }

  return data as Recurso
}

export async function deletarRecurso(id: string) {
  const { error } = await supabase
    .from('recursos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir recurso:', error)
    throw new Error('Não foi possível excluir o recurso.')
  }
}
