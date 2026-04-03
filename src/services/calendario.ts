import { supabase } from '../lib/supabase';

export type CalendarioAnoLetivo = {
  ano_letivo: number;
  inicio_ano: string;
  fim_ano: string;
  previsao_proximo_ano: string;
  periodos: Periodo[];
  tipos_evento_customizados: TipoEvento[];
  created_at?: string;
  updated_at?: string;
};

export type Periodo = {
  nome: string; // Ex: "1º Bimestre"
  inicio: string; // 'YYYY-MM-DD'
  fim: string; // 'YYYY-MM-DD'
};

export type TipoEvento = {
  nome: string;
  cor: string;
};

export type CalendarioEvento = {
  id: string;
  ano_letivo: number;
  data_evento: string; // 'YYYY-MM-DD'
  nome: string;
  tipo: string;
  cor: string;
  descricao?: string;
  created_at?: string;
  updated_at?: string;
};

// --- Funções do Ano Letivo ---

export async function getAnoLetivo(ano: number) {
  const { data, error } = await supabase
    .from('calendario_anos_letivos')
    .select('*')
    .eq('ano_letivo', ano)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignora se não achou (PGRST116)
  return data as CalendarioAnoLetivo | null;
}

export async function upsertAnoLetivo(payload: CalendarioAnoLetivo) {
  const { data, error } = await supabase
    .from('calendario_anos_letivos')
    .upsert(payload, { onConflict: 'ano_letivo' })
    .select()
    .single();

  if (error) throw error;
  return data as CalendarioAnoLetivo;
}

export async function deleteAnoLetivo(ano: number) {
  const { error } = await supabase
    .from('calendario_anos_letivos')
    .delete()
    .eq('ano_letivo', ano);

  if (error) throw error;
  return true;
}

// --- Funções dos Eventos ---

export async function getEventosPorAno(ano: number) {
  const { data, error } = await supabase
    .from('calendario_eventos')
    .select('*')
    .eq('ano_letivo', ano)
    .order('data_evento', { ascending: true });

  if (error) throw error;
  return data as CalendarioEvento[];
}

export async function upsertEvento(payload: Omit<CalendarioEvento, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
  const { data, error } = await supabase
    .from('calendario_eventos')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data as CalendarioEvento;
}

export async function deletarEvento(id: string) {
  const { error } = await supabase
    .from('calendario_eventos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function inserirListaEventosViaCSV(eventos: Omit<CalendarioEvento, 'id' | 'created_at' | 'updated_at'>[]) {
  const { error } = await supabase
    .from('calendario_eventos')
    .insert(eventos);

  if (error) throw error;
  return true;
}
