import { supabase } from '@/lib/supabase'

export type TipoHorario = 'Aula' | 'Intervalo' | 'Almoço' | 'Janta'

export interface Horario {
  id: string
  inicio: string // HH:MM
  fim: string    // HH:MM
  tipo: TipoHorario
  label: string
  created_at: string
  updated_at?: string
}

export async function getHorarios() {
  const { data, error } = await supabase
    .from('horarios')
    .select('*')
    .order('inicio', { ascending: true })

  if (error) {
    console.error('Erro ao buscar horários:', error)
    throw new Error('Não foi possível carregar os horários.')
  }

  return data as Horario[]
}

export async function criarHorario(horario: Omit<Horario, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('horarios')
    .insert([horario])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar horário:', error)
    throw new Error('Não foi possível criar o horário.')
  }

  return data as Horario
}

export async function atualizarHorario(id: string, updates: Partial<Omit<Horario, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('horarios')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar horário:', error)
    throw new Error('Não foi possível atualizar o horário.')
  }

  return data as Horario
}

export async function deletarHorario(id: string) {
  const { error } = await supabase
    .from('horarios')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir horário:', error)
    throw new Error('Não foi possível excluir o horário.')
  }
}
