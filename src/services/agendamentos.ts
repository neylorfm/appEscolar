import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Agendamento = Database['public']['Tables']['agendamentos']['Row'];
export type AgendamentoInsert = Database['public']['Tables']['agendamentos']['Insert'];

export type AgendamentoComDetalhes = Agendamento & {
  usuarios?: { nome_completo: string | null; apelido: string | null; foto_url: string | null } | null;
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
export async function getAgendamentosPorPeriodo(dataInicio: string, dataFim: string, recursoId: string) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      *,
      usuarios:usuarios!agendamentos_usuario_id_fkey ( nome_completo, apelido, foto_url ),
      agendado_por_usuario:usuarios!agendamentos_agendado_por_fkey ( nome_completo ),
      recursos ( nome, icone ),
      horarios ( inicio, fim, label, tipo )
    `)
    .eq('recurso_id', recursoId)
    .neq('tipo', 'Fixo')
    .gte('data_agendamento', dataInicio)
    .lte('data_agendamento', dataFim);
  
  if (error) throw error;
  
  // Pegar também os agendamentos "Fixos" que recaem nesse período
  const { data: fixos, error: errFixos } = await supabase
    .from('agendamentos')
    .select(`
      *,
      usuarios:usuarios!agendamentos_usuario_id_fkey ( nome_completo, apelido, foto_url ),
      agendado_por_usuario:usuarios!agendamentos_agendado_por_fkey ( nome_completo ),
      recursos ( nome, icone ),
      horarios ( inicio, fim, label, tipo )
    `)
    .eq('recurso_id', recursoId)
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
// Se Pre-Reserva -> Excluído fisicamente
// Se Fixo -> Pode ser excluído fisicamente ou arquivado via atualizarDataFimFixo
export async function cancelarOuExcluirAgendamento(agendamentoId: string, tipo: string) {
  if (tipo === 'Confirmado') {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'Cancelado' })
      .eq('id', agendamentoId);
    if (error) throw error;
    return true;
  } else {
    // Pre-reserva ou Fixo (exclusão física total se solicitado assim)
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', agendamentoId);
    if (error) throw error;
    return true;
  }
}

export async function atualizarDataFimFixo(id: string, novaDataFim: string) {
  const { error } = await supabase
    .from('agendamentos')
    .update({ data_fim_fixo: novaDataFim })
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function verificarConflitoProfessor(usuarioId: string, dataAgendamento: string, horarioId: string) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, recursos(nome), tipo')
    .eq('usuario_id', usuarioId)
    .eq('data_agendamento', dataAgendamento)
    .eq('horario_id', horarioId)
    .neq('status', 'Cancelado')
    .neq('tipo', 'Fixo'); // Fixos checamos separado devido a regra de dia_semana

  if (error) throw error;
  
  const targetDate = new Date(dataAgendamento + 'T12:00:00');
  let diaDaSemana = targetDate.getDay();
  // No banco, se 1=Seg e 5=Sex, temos que ajustar, pois getDay() 0=Dom, 1=Seg...
  // Nosso backend salva 1=Segunda, 2=Terca...
  diaDaSemana = diaDaSemana === 0 ? 7 : diaDaSemana; 

  const { data: fixos, error: errFixo } = await supabase
    .from('agendamentos')
    .select('id, recursos(nome), tipo')
    .eq('usuario_id', usuarioId)
    .eq('dia_semana_fixo', diaDaSemana)
    .eq('horario_id', horarioId)
    .eq('tipo', 'Fixo')
    .eq('status', 'Ativo')
    .or(`data_fim_fixo.gte.${dataAgendamento},data_fim_fixo.is.null`)
    .or(`data_inicio_fixo.lte.${dataAgendamento},data_inicio_fixo.is.null`);

  if (errFixo) throw errFixo;

  return [...(data || []), ...(fixos || [])];
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

// Processamento em lote (Fechamento da Sexta-Feira)
export async function processarFilaSemanal(dataInicio: string, dataFim: string) {
  // 1. Obter todas as pré-reservas do período
  const { data: preReservas, error } = await supabase
    .from('agendamentos')
    .select('recurso_id, horario_id, data_agendamento')
    .eq('tipo', 'Pre-Reserva')
    .gte('data_agendamento', dataInicio)
    .lte('data_agendamento', dataFim);
    
  if (error) throw error;
  if (!preReservas || preReservas.length === 0) return true;

  // 2. Extrair grupos únicos
  const groups = new Set<string>();
  preReservas.forEach(pr => {
    groups.add(`${pr.recurso_id}|${pr.horario_id}|${pr.data_agendamento}`);
  });

  // 3. Processar cada grupo
  for (const group of Array.from(groups)) {
    const [recId, horId, dt] = group.split('|');
    const fila = await getFilaPreReserva(recId, horId, dt);
    
    if (fila && fila.length > 0) {
      const vencedor = fila[0];
      
      // Confirmar o vencedor
      await supabase
        .from('agendamentos')
        .update({ tipo: 'Confirmado', status: 'Ativo' })
        .eq('id', vencedor.agendamento_id);
      
      // Apagar os perdedores (excluir fisicamente para limpar a agenda)
      const perdedoresIds = fila.slice(1).map(f => f.agendamento_id);
      if (perdedoresIds.length > 0) {
        await supabase
          .from('agendamentos')
          .delete()
          .in('id', perdedoresIds);
      }
    }
  }
  
  return true;
}
