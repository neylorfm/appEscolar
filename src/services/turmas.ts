import { supabase } from '@/lib/supabase'

export interface Turma {
  id: string
  serie: string
  nome: string
  created_at?: string
  updated_at?: string
}

export async function getTurmas() {
  const { data, error } = await supabase
    .from('turmas')
    .select('*')
    .order('serie', { ascending: true })
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar turmas:', error)
    throw new Error('Não foi possível carregar as turmas.')
  }

  return data as Turma[]
}

export async function criarTurma(turma: Omit<Turma, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('turmas')
    .insert([turma])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`A turma "${turma.nome}" já existe na série "${turma.serie}".`)
    }
    console.error('Erro ao criar turma:', error)
    throw new Error('Não foi possível criar a turma.')
  }

  return data as Turma
}

export async function atualizarTurma(id: string, updates: Partial<Omit<Turma, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('turmas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Esta turma já existe nesta série.`)
    }
    console.error('Erro ao atualizar turma:', error)
    throw new Error('Não foi possível atualizar a turma.')
  }

  return data as Turma
}

export async function deletarTurma(id: string) {
  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir turma:', error)
    throw new Error('Não foi possível excluir a turma.')
  }
}
