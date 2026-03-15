import { supabase } from '@/lib/supabase'

export interface Disciplina {
  id: string
  nome: string
  area_id: string
  created_at: string
  updated_at?: string
  area?: { nome: string } // Joined data
}

export async function getDisciplinas() {
  const { data, error } = await supabase
    .from('disciplinas')
    .select('*, area:areas(nome)')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar disciplinas:', error)
    throw new Error('Não foi possível carregar as disciplinas.')
  }

  return data as Disciplina[]
}

export async function criarDisciplina(nome: string, area_id: string) {
  const { data, error } = await supabase
    .from('disciplinas')
    .insert([{ nome: nome.trim(), area_id }])
    .select('*, area:areas(nome)')
    .single()

  if (error) {
    console.error('Erro ao criar disciplina:', error)
    if (error.code === '23505') {
      throw new Error(`A disciplina "${nome}" já existe.`)
    }
    throw new Error('Não foi possível criar a disciplina.')
  }

  return data as Disciplina
}

export async function criarDisciplinasLote(itens: { nome: string; area_id: string }[]) {
  const insertData = itens.map(item => ({ nome: item.nome.trim(), area_id: item.area_id }))
  
  const { data, error } = await supabase
    .from('disciplinas')
    .insert(insertData)
    .select('*, area:areas(nome)')

  if (error) {
    console.error('Erro ao importar disciplinas:', error)
    throw new Error('Não foi possível importar as disciplinas no lote.')
  }

  return data as Disciplina[]
}

export async function atualizarDisciplina(id: string, nome: string, area_id: string) {
  const { data, error } = await supabase
    .from('disciplinas')
    .update({ nome: nome.trim(), area_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, area:areas(nome)')
    .single()

  if (error) {
    console.error('Erro ao atualizar disciplina:', error)
    if (error.code === '23505') {
      throw new Error(`A disciplina "${nome}" já existe.`)
    }
    throw new Error('Não foi possível atualizar a disciplina.')
  }

  return data as Disciplina
}

export async function deletarDisciplina(id: string) {
  const { error } = await supabase
    .from('disciplinas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir disciplina:', error)
    throw new Error('Não foi possível excluir a disciplina.')
  }
}
