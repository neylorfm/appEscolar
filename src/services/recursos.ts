import { supabase } from '@/lib/supabase'

export interface Recurso {
  id: string
  nome: string
  icone: string
  detalhes: string | null
  ativo: boolean
  ordem?: number | null
  created_at: string
  updated_at?: string
}

export async function getRecursos() {
  try {
    const { data, error } = await supabase
      .from('recursos')
      .select('*')
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })

    if (error) {
      // Fallback para caso a coluna 'ordem' ainda não tenha sido criada no Supabase
      console.warn('Tentando fallback de ordenação por nome:', error.message)
      const fallback = await supabase
        .from('recursos')
        .select('*')
        .order('nome', { ascending: true })

      if (fallback.error) {
        throw fallback.error
      }
      return (fallback.data as Recurso[]) || []
    }

    return (data as Recurso[]) || []
  } catch (error) {
    console.error('Erro ao buscar recursos:', error)
    throw new Error('Não foi possível carregar os recursos.')
  }
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

export async function atualizarOrdemRecursos(itens: { id: string; ordem: number }[]) {
  const promises = itens.map(item =>
    supabase
      .from('recursos')
      .update({ ordem: item.ordem, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  )

  const results = await Promise.all(promises)
  const erro = results.find(r => r.error)?.error
  if (erro) {
    console.error('Erro ao atualizar ordem dos recursos:', erro)
    throw new Error('Não foi possível salvar a nova ordem dos recursos.')
  }
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

