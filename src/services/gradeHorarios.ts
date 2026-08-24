import { supabase } from '@/lib/supabase'

export type InstanciaGrade = 'PUBLICADA' | 'RASCUNHO'

export interface GradeHorarioItem {
  id?: string
  instancia?: InstanciaGrade
  segmento: string // 'INTEGRAL_MANHA' | 'INTEGRAL_TARDE' | 'NOTURNO'
  dia_semana: string // 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX'
  numero_aula: number // 1 a 5 (Manhã), 6 a 9 (Tarde Integral), 1 a 4 (Noite)
  turma_nome: string
  disciplina_nome: string
  disciplina_id?: string | null
  professor_nome: string
  professor_id?: string | null
  cor_destaque?: string | null
  created_at?: string
  updated_at?: string
}

export const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'] as const
export type DiaSemana = typeof DIAS_SEMANA[number]

export const NOMES_DIAS: Record<string, string> = {
  SEG: 'Segunda-feira',
  TER: 'Terça-feira',
  QUA: 'Quarta-feira',
  QUI: 'Quinta-feira',
  SEX: 'Sexta-feira'
}

export const TURMAS_INTEGRAL_PADRAO = [
  '1ª A', '1ª B', '1ª C', '1ª D', 
  '2ª A', '2ª B', '2ª C', 
  '3ª A', '3ª B', '3ª C'
]

export const TURMAS_NOTURNO_PADRAO = [
  '1ª E', '2ª D', '3ª D'
]

/**
 * Formata o nome da série e turma para exibição compacta (ex: '1º ANO' + 'A' -> '1º A')
 */
export function formatarNomeCurtoTurma(serie: string, nome: string): string {
  const s = (serie || '').trim().toUpperCase()
  const n = (nome || '').trim().toUpperCase()

  const matchNumero = s.match(/\d+/)
  const num = matchNumero ? matchNumero[0] : ''

  if (num) {
    return `${num}º ${n}`
  }
  return `${s} ${n}`.trim()
}

/**
 * Normaliza o nome da turma para garantir casamento perfeito independente de 1º, 1ª, ANO ou espaços
 */
export function normalizarNomeTurma(nome: string): string {
  if (!nome) return ""
  return nome
    .trim()
    .toUpperCase()
    .replace(/ANO|SÉRIE|SERIE/g, "")
    .replace(/[ºª°\.\-_]/g, "")
    .replace(/\s+/g, "")
}

// Paleta de 50 Cores Harmoniosas e Pastel (legíveis e diferenciadas para os professores)
export const PALETA_50_CORES = [
  "#fff2cc", "#c9daf8", "#d9ead3", "#d0e0e3", "#f4cccc", "#ead1dc", "#fce5cd", "#d9d2e9", "#d0f0c0", "#fef3c7",
  "#e0f2fe", "#dcfce7", "#e0e7ff", "#fce7f3", "#ffedd5", "#f3e8ff", "#ccfbf1", "#fee2e2", "#f1f5f9", "#fef9c3",
  "#bae6fd", "#bbf7d0", "#c7d2fe", "#fbcfe8", "#fed7aa", "#e9d5ff", "#99f6e4", "#fecaca", "#e2e8f0", "#fef08a",
  "#7dd3fc", "#86efac", "#a5b4fc", "#f472b6", "#fb923c", "#c084fc", "#5eead4", "#f87171", "#cbd5e1", "#fde047",
  "#38bdf8", "#4ade80", "#818cf8", "#fb7185", "#f97316", "#a855f7", "#2dd4bf", "#ef4444", "#94a3b8", "#eab308"
]

/**
 * Retorna uma cor padrão estável das 50 cores a partir do nome do professor
 */
export function getCorPadraoPorNome(nome: string): string {
  if (!nome) return PALETA_50_CORES[0]
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = (hash << 5) - hash + nome.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % PALETA_50_CORES.length
  return PALETA_50_CORES[index]
}

export type IdFonteGrade = 'sistema' | 'inter' | 'ibm-plex' | 'roboto-condensed'

export interface OpcaoFonteGrade {
  id: IdFonteGrade
  nome: string
  descricao: string
  fontFamily: string
}

export const OPCOES_FONTES_GRADE: OpcaoFonteGrade[] = [
  {
    id: 'sistema',
    nome: 'Padrão do Sistema (Original)',
    descricao: 'Segoe UI / San Francisco',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  {
    id: 'inter',
    nome: 'Inter',
    descricao: 'Moderna e Nítida',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  {
    id: 'ibm-plex',
    nome: 'IBM Plex Sans',
    descricao: 'Técnica e Estruturada',
    fontFamily: "'IBM Plex Sans', -apple-system, sans-serif"
  },
  {
    id: 'roboto-condensed',
    nome: 'Roboto Condensed',
    descricao: 'Compacta (Mais espaço)',
    fontFamily: "'Roboto Condensed', sans-serif"
  }
]

const CHAVE_STORAGE_FONTE = 'app_escolar_fonte_grade'

export function getFonteGrade(): IdFonteGrade {
  try {
    const salva = localStorage.getItem(CHAVE_STORAGE_FONTE) as IdFonteGrade
    if (salva && OPCOES_FONTES_GRADE.some(f => f.id === salva)) {
      return salva
    }
  } catch {}
  return 'inter'
}

export function salvarFonteGrade(fonte: IdFonteGrade) {
  try {
    localStorage.setItem(CHAVE_STORAGE_FONTE, fonte)
  } catch {}
}

export function getFontFamilyById(id: IdFonteGrade): string {
  const achada = OPCOES_FONTES_GRADE.find(f => f.id === id)
  return achada ? achada.fontFamily : OPCOES_FONTES_GRADE[0].fontFamily
}

const CHAVE_STORAGE_CORES = 'app_escolar_cores_professores'

export function getMapaCoresSalvas(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_CORES)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function salvarCorProfessorStorage(nome: string, cor: string) {
  try {
    const prof = nome.trim().toUpperCase()
    if (!prof) return
    const mapa = getMapaCoresSalvas()
    mapa[prof] = cor
    localStorage.setItem(CHAVE_STORAGE_CORES, JSON.stringify(mapa))
  } catch (err) {
    console.warn('Erro ao salvar cor no storage:', err)
  }
}

/**
 * Retorna a cor efetiva do professor:
 * 1. Cor do slot
 * 2. Cor do mapa global de aulas já cadastradas
 * 3. Cor memorizada no localStorage
 * 4. Cor padrão determinística da paleta de 50
 */
export function obterCorEfetivaProfessor(
  nome: string,
  corSlot?: string | null,
  mapaGlobal?: Map<string, string>
): string {
  const prof = nome?.trim().toUpperCase()
  if (!prof) return PALETA_50_CORES[0]

  if (corSlot) return corSlot

  if (mapaGlobal && mapaGlobal.has(prof)) {
    return mapaGlobal.get(prof)!
  }

  const salvas = getMapaCoresSalvas()
  if (salvas[prof]) {
    return salvas[prof]
  }

  return getCorPadraoPorNome(prof)
}

/**
 * Calcula estilo inline com fundo, texto escuro de alto contraste e borda a partir de um HEX
 */
export function getEstiloBadgeCor(hexColor: string) {
  const hex = (hexColor || PALETA_50_CORES[0]).replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16) || 240
  const g = parseInt(hex.substring(2, 4), 16) || 240
  const b = parseInt(hex.substring(4, 6), 16) || 240

  // Luminância para contraste
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const isClaro = luminancia > 0.55

  const textColor = isClaro ? "#1e293b" : "#ffffff"
  const borderColor = isClaro ? `rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.5)` : "rgba(255, 255, 255, 0.2)"

  return {
    backgroundColor: hexColor || PALETA_50_CORES[0],
    color: textColor,
    borderColor: borderColor
  }
}

export const ESTRUTURA_AULAS = {
  INTEGRAL_MANHA: [
    { numero: 1, rotulo: '1ª AULA' },
    { numero: 2, rotulo: '2ª AULA' },
    { numero: 3, rotulo: '3ª AULA' },
    { numero: 4, rotulo: '4ª AULA' },
    { numero: 5, rotulo: '5ª AULA' },
  ],
  INTEGRAL_TARDE: [
    { numero: 6, rotulo: '6ª AULA (1ª Tarde)' },
    { numero: 7, rotulo: '7ª AULA (2ª Tarde)' },
    { numero: 8, rotulo: '8ª AULA (3ª Tarde)' },
    { numero: 9, rotulo: '9ª AULA (4ª Tarde)' },
  ],
  INTEGRAL_COMPLETO: [
    { numero: 1, rotulo: '1ª AULA' },
    { numero: 2, rotulo: '2ª AULA' },
    { numero: 3, rotulo: '3ª AULA' },
    { numero: 4, rotulo: '4ª AULA' },
    { numero: 5, rotulo: '5ª AULA' },
    { numero: 6, rotulo: '6ª AULA (Tarde)' },
    { numero: 7, rotulo: '7ª AULA (Tarde)' },
    { numero: 8, rotulo: '8ª AULA (Tarde)' },
    { numero: 9, rotulo: '9ª AULA (Tarde)' },
  ],
  NOTURNO: [
    { numero: 1, rotulo: '1ª AULA' },
    { numero: 2, rotulo: '2ª AULA' },
    { numero: 3, rotulo: '3ª AULA' },
    { numero: 4, rotulo: '4ª AULA' },
  ]
}

/**
 * Busca itens da grade por segmento e instância (PUBLICADA ou RASCUNHO)
 */
export async function getGradeHorarios(
  segmento?: string, 
  instancia: InstanciaGrade = 'PUBLICADA'
): Promise<GradeHorarioItem[]> {
  try {
    let query = supabase
      .from('grade_horarios')
      .select('*')
      .eq('instancia', instancia)
      .order('numero_aula', { ascending: true })

    if (segmento && segmento !== 'TODOS') {
      if (segmento === 'INTEGRAL_COMPLETO') {
        query = query.in('segmento', ['INTEGRAL_MANHA', 'INTEGRAL_TARDE'])
      } else {
        query = query.eq('segmento', segmento)
      }
    }

    const { data, error } = await query

    if (error) {
      console.warn(`Tabela grade_horarios para instância ${instancia} indisponível ou vazia:`, error.message)
      return []
    }

    // Deduplica garantindo rigorosamente apenas 1 registro por célula
    const mapaUnico = new Map<string, GradeHorarioItem>()
    for (const row of (data as GradeHorarioItem[]) || []) {
      const chave = `${row.segmento}_${row.dia_semana}_${row.numero_aula}_${normalizarNomeTurma(row.turma_nome)}`
      mapaUnico.set(chave, row)
    }

    return Array.from(mapaUnico.values())
  } catch (err) {
    console.error('Erro ao buscar grade de horários:', err)
    return []
  }
}

/**
 * Salva ou atualiza uma célula na instância especificada (padrão: RASCUNHO)
 */
export async function salvarCelulaGrade(item: {
  instancia?: InstanciaGrade
  segmento: string
  dia_semana: string
  numero_aula: number
  turma_nome: string
  disciplina_nome: string
  disciplina_id?: string | null
  professor_nome: string
  professor_id?: string | null
  cor_destaque?: string | null
}) {
  const instanciaAlvo = item.instancia || 'RASCUNHO'
  const norm = normalizarNomeTurma(item.turma_nome)

  // 1. Limpa registros anteriores dessa mesma célula para evitar duplicidades na instância alvo
  await supabase
    .from('grade_horarios')
    .delete()
    .eq('instancia', instanciaAlvo)
    .eq('segmento', item.segmento)
    .eq('dia_semana', item.dia_semana)
    .eq('numero_aula', item.numero_aula)
    .or(`turma_nome.eq.${item.turma_nome},turma_nome.ilike.%${norm}%`)

  // 2. Insere a célula atualizada
  const payload = {
    instancia: instanciaAlvo,
    segmento: item.segmento,
    dia_semana: item.dia_semana,
    numero_aula: item.numero_aula,
    turma_nome: item.turma_nome,
    disciplina_nome: item.disciplina_nome.trim().toUpperCase(),
    disciplina_id: item.disciplina_id || null,
    professor_nome: item.professor_nome.trim().toUpperCase(),
    professor_id: item.professor_id || null,
    cor_destaque: item.cor_destaque || null,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('grade_horarios')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao salvar célula da grade:', error)
    throw new Error('Não foi possível salvar o horário.')
  }

  return data as GradeHorarioItem
}

/**
 * Limpa uma célula da grade na instância especificada (padrão: RASCUNHO)
 */
export async function limparCelulaGrade(
  segmento: string,
  dia_semana: string,
  numero_aula: number,
  turma_nome: string,
  instancia: InstanciaGrade = 'RASCUNHO'
) {
  const norm = normalizarNomeTurma(turma_nome)

  const { error } = await supabase
    .from('grade_horarios')
    .delete()
    .eq('instancia', instancia)
    .eq('segmento', segmento)
    .eq('dia_semana', dia_semana)
    .eq('numero_aula', numero_aula)
    .or(`turma_nome.eq.${turma_nome},turma_nome.ilike.%${norm}%`)

  if (error) {
    console.error('Erro ao limpar célula da grade:', error)
    throw new Error('Não foi possível remover o horário.')
  }
}

/**
 * Clona todos os registros da instância de Visualização (PUBLICADA) para a instância de Edição (RASCUNHO)
 */
export async function copiarInstanciaVisualizacaoParaEdicao(): Promise<number> {
  // 1. Busca todos os itens da grade publicada
  const { data: itensPublicados, error: erroPublicados } = await supabase
    .from('grade_horarios')
    .select('*')
    .eq('instancia', 'PUBLICADA')

  if (erroPublicados) {
    console.error('Erro ao buscar grade publicada para cópia:', erroPublicados)
    throw new Error('Não foi possível carregar a grade de visualização.')
  }

  // 2. Limpa todos os itens do rascunho anterior
  const { error: erroDelete } = await supabase
    .from('grade_horarios')
    .delete()
    .eq('instancia', 'RASCUNHO')

  if (erroDelete) {
    console.error('Erro ao limpar rascunho de edição:', erroDelete)
    throw new Error('Falha ao preparar o ambiente de edição.')
  }

  if (!itensPublicados || itensPublicados.length === 0) {
    return 0
  }

  // 3. Prepara os novos itens para inserção no RASCUNHO
  const novosItens = itensPublicados.map(item => ({
    instancia: 'RASCUNHO' as InstanciaGrade,
    segmento: item.segmento,
    dia_semana: item.dia_semana,
    numero_aula: item.numero_aula,
    turma_nome: item.turma_nome,
    disciplina_nome: item.disciplina_nome,
    disciplina_id: item.disciplina_id || null,
    professor_nome: item.professor_nome,
    professor_id: item.professor_id || null,
    cor_destaque: item.cor_destaque || null,
    updated_at: new Date().toISOString()
  }))

  // Inserção em lotes de 100
  const BATCH_SIZE = 100
  for (let i = 0; i < novosItens.length; i += BATCH_SIZE) {
    const lote = novosItens.slice(i, i + BATCH_SIZE)
    const { error: erroInsert } = await supabase
      .from('grade_horarios')
      .insert(lote)

    if (erroInsert) {
      console.error('Erro ao inserir lote no rascunho:', erroInsert)
      throw new Error('Falha ao duplicar dados na instância de edição.')
    }
  }

  // Copia a vigência publicada para o rascunho
  const vigenciaPub = await getVigenciaGrade('PUBLICADA')
  if (vigenciaPub) {
    await salvarVigenciaGrade('RASCUNHO', vigenciaPub)
  }

  return novosItens.length
}

/**
 * Publica a grade de Edição (RASCUNHO) para a grade de Visualização (PUBLICADA) com a nova vigência
 */
export async function publicarInstanciaEdicao(textoVigencia: string): Promise<number> {
  // 1. Busca todos os itens do rascunho atual
  const { data: itensRascunho, error: erroRascunho } = await supabase
    .from('grade_horarios')
    .select('*')
    .eq('instancia', 'RASCUNHO')

  if (erroRascunho) {
    console.error('Erro ao buscar rascunho para publicação:', erroRascunho)
    throw new Error('Não foi possível carregar a grade de edição.')
  }

  // 2. Limpa a grade publicada anterior
  const { error: erroDelete } = await supabase
    .from('grade_horarios')
    .delete()
    .eq('instancia', 'PUBLICADA')

  if (erroDelete) {
    console.error('Erro ao limpar grade publicada anterior:', erroDelete)
    throw new Error('Falha ao preparar publicação.')
  }

  const itensInseridos = itensRascunho || []

  if (itensInseridos.length > 0) {
    // 3. Prepara os novos itens para inserção como PUBLICADA
    const novosPublicados = itensInseridos.map(item => ({
      instancia: 'PUBLICADA' as InstanciaGrade,
      segmento: item.segmento,
      dia_semana: item.dia_semana,
      numero_aula: item.numero_aula,
      turma_nome: item.turma_nome,
      disciplina_nome: item.disciplina_nome,
      disciplina_id: item.disciplina_id || null,
      professor_nome: item.professor_nome,
      professor_id: item.professor_id || null,
      cor_destaque: item.cor_destaque || null,
      updated_at: new Date().toISOString()
    }))

    const BATCH_SIZE = 100
    for (let i = 0; i < novosPublicados.length; i += BATCH_SIZE) {
      const lote = novosPublicados.slice(i, i + BATCH_SIZE)
      const { error: erroInsert } = await supabase
        .from('grade_horarios')
        .insert(lote)

      if (erroInsert) {
        console.error('Erro ao inserir lote publicado:', erroInsert)
        throw new Error('Falha ao gravar grade publicada.')
      }
    }
  }

  // 4. Salva a nova vigência publicada
  await salvarVigenciaGrade('PUBLICADA', textoVigencia)
  localStorage.setItem('grade_horarios_vigencia', textoVigencia)

  return itensInseridos.length
}

/**
 * Carrega a legenda de vigência da instância
 */
export async function getVigenciaGrade(instancia: InstanciaGrade = 'PUBLICADA'): Promise<string> {
  try {
    const chave = instancia === 'PUBLICADA' ? 'grade_vigencia_publicada' : 'grade_vigencia_rascunho'
    const cached = localStorage.getItem(`grade_horarios_vigencia_${instancia.toLowerCase()}`) || localStorage.getItem('grade_horarios_vigencia')
    
    const { data } = await supabase
      .from('configuracoes_instituicao')
      .select(chave)
      .maybeSingle()

    if (data && (data as any)[chave]) {
      return (data as any)[chave]
    }

    return cached || 'Válido a partir de 05/02/2026 • 1º Bimestre'
  } catch {
    return 'Válido a partir de 05/02/2026 • 1º Bimestre'
  }
}

/**
 * Salva a legenda de vigência da instância
 */
export async function salvarVigenciaGrade(instancia: InstanciaGrade, texto: string): Promise<void> {
  try {
    const chave = instancia === 'PUBLICADA' ? 'grade_vigencia_publicada' : 'grade_vigencia_rascunho'
    localStorage.setItem(`grade_horarios_vigencia_${instancia.toLowerCase()}`, texto)
    if (instancia === 'PUBLICADA') {
      localStorage.setItem('grade_horarios_vigencia', texto)
    }

    const { data: config } = await supabase
      .from('configuracoes_instituicao')
      .select('id')
      .maybeSingle()

    if (config?.id) {
      await supabase
        .from('configuracoes_instituicao')
        .update({ [chave]: texto })
        .eq('id', config.id)
    }
  } catch (err) {
    console.error('Erro ao salvar vigência da grade:', err)
  }
}

/**
 * Cria ou recupera uma disciplina instantaneamente pelo nome
 */
export async function garantirDisciplina(nome: string) {
  const nomeFormatado = nome.trim().toUpperCase()
  if (!nomeFormatado) return null

  try {
    const { data: existente } = await supabase
      .from('disciplinas')
      .select('id, nome')
      .ilike('nome', nomeFormatado)
      .maybeSingle()

    if (existente) {
      return existente
    }

    // Se não existir, obter uma área padrão ou criar disciplina
    const { data: areas } = await supabase
      .from('areas')
      .select('id')
      .limit(1)

    const areaId = areas && areas.length > 0 ? areas[0].id : null

    if (areaId) {
      const { data: nova } = await supabase
        .from('disciplinas')
        .insert([{ nome: nomeFormatado, area_id: areaId }])
        .select('id, nome')
        .single()
      return nova
    }
  } catch (err) {
    console.warn('Não foi possível registrar disciplina em lote na tabela disciplinas:', err)
  }

  return { id: null, nome: nomeFormatado }
}

/**
 * Detecta se algum professor está escalado em 2 ou mais turmas no mesmo dia e número de aula
 * Retorna um Set com chaves de conflito no formato: `${dia_semana}_${numero_aula}_${professor_nome}`
 */
export function detectarChoquesHorario(itens: GradeHorarioItem[]): {
  conflitosMap: Map<string, string[]> // chave -> lista de turmas conflitantes
  conflitosSet: Set<string> // chaves de células conflitantes: `${segmento}_${dia_semana}_${numero_aula}_${turma_nome}`
} {
  const conflitosSet = new Set<string>()
  const conflitosMap = new Map<string, string[]>()

  // Agrupa por Dia + Aula + Nome do Professor
  const mapaAlocacoes = new Map<string, GradeHorarioItem[]>()

  for (const item of itens) {
    const prof = item.professor_nome?.trim().toUpperCase()
    if (!prof) continue

    const chaveGlobal = `${item.dia_semana}_${item.numero_aula}_${prof}`
    const lista = mapaAlocacoes.get(chaveGlobal) || []
    lista.push(item)
    mapaAlocacoes.set(chaveGlobal, lista)
  }

  for (const [chaveGlobal, alocacoes] of mapaAlocacoes.entries()) {
    if (alocacoes.length > 1) {
      const turmas = alocacoes.map(a => a.turma_nome)
      conflitosMap.set(chaveGlobal, turmas)

      for (const a of alocacoes) {
        conflitosSet.add(`${a.segmento}_${a.dia_semana}_${a.numero_aula}_${a.turma_nome}`)
        conflitosSet.add(`${a.segmento}_${a.dia_semana}_${a.numero_aula}_${normalizarNomeTurma(a.turma_nome)}`)
      }
    }
  }

  return { conflitosMap, conflitosSet }
}

/**
 * Atualiza a cor de destaque de todas as aulas de um determinado professor
 */
export async function atualizarCorProfessorGlobal(
  professorNome: string, 
  novaCor: string,
  instancia?: InstanciaGrade
) {
  const prof = professorNome.trim().toUpperCase()
  if (!prof) return

  // Salva no cache local instantâneo
  salvarCorProfessorStorage(prof, novaCor)

  let query = supabase
    .from('grade_horarios')
    .update({ cor_destaque: novaCor, updated_at: new Date().toISOString() })
    .ilike('professor_nome', prof)

  if (instancia) {
    query = query.eq('instancia', instancia)
  }

  const { error } = await query

  if (error) {
    console.error('Erro ao atualizar cor global do professor:', error)
    throw new Error('Não foi possível atualizar a cor do professor.')
  }
}

/**
 * Recupera se a visualização do Quadro de Horários está liberada para professores e alunos
 */
export async function getVisibilidadeGradeHorarios(): Promise<boolean> {
  try {
    const cached = localStorage.getItem('grade_horarios_publicada')
    const defaultValue = cached !== null ? cached === 'true' : true

    const { data, error } = await supabase
      .from('configuracoes_instituicao')
      .select('modulo_horarios_ativo')
      .maybeSingle()

    if (error || !data) {
      return defaultValue
    }

    const ativo = data.modulo_horarios_ativo ?? true
    localStorage.setItem('grade_horarios_publicada', String(ativo))
    return ativo
  } catch {
    return true
  }
}

/**
 * Atualiza o status de liberação do Quadro de Horários (Restrito a Administrador)
 */
export async function setVisibilidadeGradeHorarios(publicada: boolean): Promise<void> {
  try {
    localStorage.setItem('grade_horarios_publicada', String(publicada))

    const { data: config } = await supabase
      .from('configuracoes_instituicao')
      .select('id')
      .maybeSingle()

    if (config?.id) {
      await supabase
        .from('configuracoes_instituicao')
        .update({ modulo_horarios_ativo: publicada })
        .eq('id', config.id)
    }
  } catch (err) {
    console.error('Erro ao atualizar visibilidade da grade:', err)
  }
}


