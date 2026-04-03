import { supabase } from '@/lib/supabase'

export interface Aluno {
  matricula: string
  nome: string
  turma_id?: string | null
  created_at?: string
  updated_at?: string
}

export async function getAlunos() {
  const { data, error } = await supabase
    .from('alunos')
    .select(`
      *,
      turmas (
        id,
        serie,
        nome
      )
    `)
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar alunos:', error)
    throw new Error('Não foi possível carregar os alunos.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as (Aluno & { turmas?: any })[]
}

export async function getAlunosPorTurma(turmaId: string) {
  const { data, error } = await supabase
    .from('alunos')
    .select(`
      *,
      turmas (
        id,
        serie,
        nome
      )
    `)
    .eq('turma_id', turmaId)
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar alunos por turma:', error)
    throw new Error('Não foi possível carregar os alunos da turma.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as (Aluno & { turmas?: any })[]
}

export async function criarAluno(aluno: Omit<Aluno, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('alunos')
    .insert([aluno])
    .select(`
      *,
      turmas (
        id,
        serie,
        nome
      )
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`O aluno com matrícula "${aluno.matricula}" já existe.`)
    }
    console.error('Erro ao criar aluno:', error)
    throw new Error('Não foi possível criar o aluno.')
  }

  return data
}

export async function atualizarAluno(matricula: string, updates: Partial<Omit<Aluno, 'matricula' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('alunos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('matricula', matricula)
    .select(`
      *,
      turmas (
        id,
        serie,
        nome
      )
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar aluno:', error)
    throw new Error('Não foi possível atualizar o aluno.')
  }

  return data
}

export async function deletarAluno(matricula: string) {
  const { error } = await supabase
    .from('alunos')
    .delete()
    .eq('matricula', matricula)

  if (error) {
    console.error('Erro ao excluir aluno:', error)
    throw new Error('Não foi possível excluir o aluno.')
  }
}

export async function criarAlunosEmMassa(alunos: Omit<Aluno, 'created_at' | 'updated_at'>[]) {
  const { data, error } = await supabase
    .from('alunos')
    .upsert(alunos, { onConflict: 'matricula', ignoreDuplicates: false })
    .select(`
      *,
      turmas (
        id,
        serie,
        nome
      )
    `)

  if (error) {
    console.error('Erro ao criar alunos em massa:', error)
    throw new Error('Não foi possível importar os alunos.')
  }

  return data
}
