import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Agendamento = Database['public']['Tables']['agendamentos']['Row'];
export type AgendamentoInsert = Database['public']['Tables']['agendamentos']['Insert'];

export type AgendamentoComDetalhes = Agendamento & {
  usuarios?: { nome_completo: string | null; foto_url: string | null } | null;
  agendado_por_usuario?: { nome_completo: string | null } | null;
  recursos?: { nome: string; icone: string } | null;
  horarios?: { inicio: string; fim: string; label: string; tipo: string } | null;
};

export type FilaPreReserva = {
  agendamento_id: string;
  usuario_id: string;
  nome_professor: string;
  data_agendamento: string;
  score: number;
  quantidade_agendamentos: number;
  quantidade_cancelamentos: number;
  ordem: number;
};

// 1. Buscar todos os agendamentos de uma semana (com detalhes)
export async function getAgendamentosPorPeriodo(dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      *,
      usuarios ( nome_completo, foto_url ),
      agendado_por_usuario:usuarios!agendamentos_agendado_por_fkey ( nome_completo ),
      recursos ( nome, icone ),
      horarios ( inicio, fim, label, tipo )
    `)
    .gte('data_agendamento', dataInicio)
    .lte('data_agendamento', dataFim);
  
  if (error) throw error;
  
  // Pegar também os agendamentos "Fixos" que recaem nesse período
  const { data: fixos, error: errFixos } = await supabase
    .from('agendamentos')
    .select(`
      *,
      usuarios ( nome_completo, foto_url ),
      agendado_por_usuario:usuarios!agendamentos_agendado_por_fkey ( nome_completo ),
      recursos ( nome, icone ),
      horarios ( inicio, fim, label, tipo )
    `)
    .eq('tipo', 'Fixo')
    .eq('status', 'Ativo')
    .or(`data_fim_fixo.gte.${dataInicio},data_fim_fixo.is.null`)
    .or(`data_inicio_fixo.lte.${dataFim},data_inicio_fixo.is.null`);

  if (errFixos) throw errFixos;
  
  return [...(data || []), ...(fixos || [])] as AgendamentoComDetalhes[];
}

// 2. Buscar a fila de pré-reservas usando a RPC
export async function getFilaPreReserva(recursoId: string, horarioId: string, dataAgendamento: string) {
  const { data, error } = await supabase.rpc('get_fila_pre_reserva', {
    p_recurso_id: recursoId,
    p_horario_id: horarioId,
    p_data: dataAgendamento
  });

  if (error) throw error;
  return data as FilaPreReserva[];
}

// 3. Criar Agendamento (Validações pesadas no frontend, garantia simples aqui)
export async function criarAgendamento(agendamento: AgendamentoInsert) {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert([agendamento])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. Cancelar/Excluir Agendamento
// Se Confirmado -> vira Cancelado (para o Score 'C')
// Se Pre-Reserva ou Fixo -> Excluído fisicamente
export async function cancelarOuExcluirAgendamento(agendamentoId: string, tipo: string) {
  if (tipo === 'Confirmado') {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'Cancelado' })
      .eq('id', agendamentoId);
    if (error) throw error;
    return true;
  } else {
    // Pre-reserva ou Fixo é só deletar
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', agendamentoId);
    if (error) throw error;
    return true;
  }
}

// Atualiza o status de pré-reservas se a data já passou (Auto confirmação sexta)
export async function consolidarPreReservasPassadas(recursoId: string, horarioId: string, dataAgendamento: string, agendamentoVencedorId: string) {
   // Confirma o vencedor
   const { error: err1 } = await supabase
    .from('agendamentos')
    .update({ tipo: 'Confirmado' })
    .eq('id', agendamentoVencedorId);
   if (err1) throw err1;

   // Cancela os demais
   const { error: err2 } = await supabase
    .from('agendamentos')
    .update({ status: 'Cancelado' })
    .eq('recurso_id', recursoId)
    .eq('horario_id', horarioId)
    .eq('data_agendamento', dataAgendamento)
    .eq('tipo', 'Pre-Reserva')
    .neq('id', agendamentoVencedorId);
   
   if (err2) throw err2;
   return true;
}
