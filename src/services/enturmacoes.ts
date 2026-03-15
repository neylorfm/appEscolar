import { supabase } from '@/lib/supabase'

export interface ProfessorDisciplina {
  id: string
  professor_id: string
  disciplina_id: string
  
  // Relações
  disciplina?: { id: string; nome: string; area?: { nome: string } }
  professor?: { id: string; nome_completo: string; email: string }
}

/**
 * Retorna as disciplinas vinculadas a um professor, ou todas se não passar ID.
 */
export async function getProfessorDisciplinas(professorId?: string) {
  let query = supabase
    .from('professor_disciplinas')
    .select(`
      *,
      disciplina:disciplinas(id, nome, area:areas(nome)),
      professor:usuarios!professor_disciplinas_professor_id_fkey(id, nome_completo, email)
    `)
    
  if (professorId) {
    query = query.eq('professor_id', professorId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar disciplinas do professor:', error)
    throw new Error('Não foi possível carregar as disciplinas vinculadas.')
  }

  return data as ProfessorDisciplina[]
}

/**
 * Cria o vínculo entre o Professor e uma Disciplina.
 */
export async function vincularProfessorDisciplina(professorId: string, disciplinaId: string) {
  const { data, error } = await supabase
    .from('professor_disciplinas')
    .insert({ professor_id: professorId, disciplina_id: disciplinaId })
    .select(`
      *,
      disciplina:disciplinas(id, nome, area:areas(nome)),
      professor:usuarios!professor_disciplinas_professor_id_fkey(id, nome_completo, email)
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
       throw new Error('Este professor já está vinculado a esta disciplina.')
    }
    console.error('Erro ao vincular professor:', error)
    throw new Error('Não foi possível vincular a disciplina.')
  }

  return data as ProfessorDisciplina
}

/**
 * Remove o vínculo entre o Professor e uma Disciplina.
 */
export async function desvincularProfessorDisciplina(idVinculo: string) {
  const { error } = await supabase
    .from('professor_disciplinas')
    .delete()
    .eq('id', idVinculo)

  if (error) {
    console.error('Erro ao desvincular professor:', error)
    throw new Error('Não foi possível remover o vínculo.')
  }

  return true
}
