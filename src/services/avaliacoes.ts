import { supabase } from "@/lib/supabase"

/**
 * Definições da estrutura JSONB para disciplinas e resultados
 */
export interface DisciplinaConfig {
  nome: string       // ex: 'Português', 'Inglês'
  inicio: number     // numero de 1 a N
  valor: number      // peso da questao. ex: 0.5
}

export type ResolucaoJsonb = string[] // ex: ["A", "B", "C"] (Array de 0-index. Index 0 = questao 1)

export interface Avaliacao {
  id: string
  ano_letivo: number
  etapa: '1º BIMESTRE' | '2º BIMESTRE' | '3º BIMESTRE' | '4º BIMESTRE' | 'RECUPERAÇÃO FINAL' | string
  nome: string
  quantidade_questoes: number
  disciplinas: DisciplinaConfig[]
  gabarito: ResolucaoJsonb | null
  questoes_anuladas: number[] | null
  created_at: string
  updated_at: string
}

export interface ResultadoAluno {
  id: string
  avaliacao_id: string
  aluno_id: string
  respostas: ResolucaoJsonb | null
  pontuacoes: Record<string, number> | null // ex: { "Português": 8.5, "_total_geral": 18.5 }
  created_at: string
  updated_at: string
  
  // Extra via JOIN
  alunos?: {
    nome_completo: string
    matricula: string
  }
}

/**
 * Regra de Negócio Pura: Calcula a nota de um aluno dado suas respostas, o gabarito oficial
 * e a configuração da avaliação. 
 * A regra da questão anulada é: Se ela foi anulada E o aluno respondeu *alguma* coisa (não deixou em branco), 
 * ele ganha o ponto daquela questão.
 */
export function calcularNota(
  respostas: ResolucaoJsonb,
  disciplinas: DisciplinaConfig[],
  gabarito: ResolucaoJsonb | null,
  anuladas: number[] | null
): Record<string, number> {
  const pontuacoes: Record<string, number> = {}
  let totalGeral = 0

  if (!gabarito || gabarito.length === 0) {
    // Sem gabarito não há como calcular
    return {}
  }

  const questoesAnuladas = new Set(anuladas || [])

  // Ordenamos as disciplinas por 'inicio' para saber onde terminam
  const discOrdenadas = [...disciplinas].sort((a, b) => a.inicio - b.inicio)

  discOrdenadas.forEach((disc, index) => {
    let notaDs = 0
    const startQ = disc.inicio
    // A disciplina vai do start dela até ANTES do start da próxima, ou o fim das respostas/gabarito
    const nextStartQ = index < discOrdenadas.length - 1 ? discOrdenadas[index + 1].inicio : gabarito.length + 1

    for (let q = startQ; q < nextStartQ; q++) {
      const arrayIndex = q - 1 // array é 0-indexed
      if (arrayIndex >= respostas.length || arrayIndex >= gabarito.length) continue

      const respostaObj = respostas[arrayIndex]?.toUpperCase() || ''
      const gabaritoObj = gabarito[arrayIndex]?.toUpperCase() || ''

      const isAnulada = questoesAnuladas.has(q)
      
      if (isAnulada && respostaObj !== '') {
        // Acerto por anulação (só ganha quem marcou algo)
        notaDs += disc.valor
      } else if (!isAnulada && respostaObj === gabaritoObj && respostaObj !== '') {
        // Acerto tradicional
        notaDs += disc.valor
      }
    }

    pontuacoes[disc.nome] = Number(notaDs.toFixed(2)) // evita flutuações float javascript
    totalGeral += notaDs
  })

  pontuacoes['_total_geral'] = Number(totalGeral.toFixed(2))
  return pontuacoes
}


export async function getAvaliacoes() {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select(`
      *,
      avaliacoes_turmas(turma_id)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar avaliações:', error)
    return []
  }

  // parse do formato join
  return data.map(item => ({
    ...item,
    turmas_ids: item.avaliacoes_turmas?.map((t: any) => t.turma_id) || []
  }))
}

export async function getAvaliacaoPorId(id: string) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select(`
      *,
      avaliacoes_turmas(turma_id)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Erro ao buscar avaliacao:', error)
    return null
  }

  return {
    ...data,
    turmas_ids: data.avaliacoes_turmas?.map((t: any) => t.turma_id) || []
  }
}

export async function criarAvaliacao(
  avaliacao: Omit<Avaliacao, 'id' | 'created_at' | 'updated_at'>,
  turmasIds: string[]
) {
  const { data: novaAvaliacao, error: errAvaliacao } = await supabase
    .from('avaliacoes')
    .insert([{
      ano_letivo: avaliacao.ano_letivo,
      etapa: avaliacao.etapa,
      nome: avaliacao.nome,
      quantidade_questoes: avaliacao.quantidade_questoes,
      disciplinas: avaliacao.disciplinas,
      gabarito: avaliacao.gabarito,
      questoes_anuladas: avaliacao.questoes_anuladas
    }])
    .select()
    .single()

  if (errAvaliacao || !novaAvaliacao) {
    console.error('Erro ao criar avaliação:', errAvaliacao)
    throw errAvaliacao
  }

  if (turmasIds.length > 0) {
    const relacoes = turmasIds.map(tId => ({
      avaliacao_id: novaAvaliacao.id,
      turma_id: tId
    }))

    const { error: errTurmas } = await supabase
      .from('avaliacoes_turmas')
      .insert(relacoes)

    if (errTurmas) {
      console.error('Erro ao vincular turmas. Apagando...', errTurmas)
      await supabase.from('avaliacoes').delete().eq('id', novaAvaliacao.id)
      throw errTurmas
    }
  }

  return novaAvaliacao
}

export async function deletarAvaliacao(id: string) {
  const { error } = await supabase
    .from('avaliacoes')
    .delete()
    .eq('id', id)
    
  if (error) {
    console.error('Erro ao deletar avaliação:', error)
    throw error
  }
}

// TODO: Lançamentos de turmas CSV (Será implementado na fase de UI relatórios/notas)
