-- Function para trazer a fila de pré-reservas de um recurso em certa data/horário
-- Calcula o Score (A + C + O)
CREATE OR REPLACE FUNCTION get_fila_pre_reserva(
    p_recurso_id uuid,
    p_horario_id uuid,
    p_data date
) RETURNS TABLE (
    agendamento_id uuid,
    usuario_id uuid,
    nome_professor text,
    data_agendamento date,
    score integer,
    quantidade_agendamentos integer,
    quantidade_cancelamentos integer,
    ordem integer
) AS $$
DECLARE
    v_data_limite date := p_data - interval '21 days';
BEGIN
    RETURN QUERY
    WITH agendamentos_professores AS (
        SELECT 
            a.id as agendamento_id,
            a.usuario_id,
            u.nome_completo as nome_professor,
            a.data_agendamento,
            a.created_at,
            (ROW_NUMBER() OVER (ORDER BY a.created_at ASC))::integer as ordem -- 'O' na fórmula
        FROM public.agendamentos a
        JOIN public.usuarios u ON a.usuario_id = u.id
        WHERE a.recurso_id = p_recurso_id
          AND a.horario_id = p_horario_id
          AND a.data_agendamento = p_data
          AND a.tipo = 'Pre-Reserva'
          AND a.status = 'Ativo'
    ),
    metricas_professores AS (
        SELECT 
            a.usuario_id,
            (COUNT(*) FILTER (WHERE a.status = 'Ativo' AND a.tipo IN ('Confirmado', 'Fixo')))::integer as qtd_agendamentos,
            (COUNT(*) FILTER (WHERE a.status = 'Cancelado'))::integer as qtd_cancelamentos
        FROM public.agendamentos a
        WHERE a.recurso_id = p_recurso_id
          AND a.data_agendamento >= v_data_limite
          AND a.data_agendamento <= p_data
        GROUP BY a.usuario_id
    )
    SELECT 
        ap.agendamento_id,
        ap.usuario_id,
        ap.nome_professor,
        ap.data_agendamento,
        -- Score S = A + C + O
        (COALESCE(mp.qtd_agendamentos, 0) + COALESCE(mp.qtd_cancelamentos, 0) + ap.ordem)::integer AS score,
        COALESCE(mp.qtd_agendamentos, 0)::integer,
        COALESCE(mp.qtd_cancelamentos, 0)::integer,
        ap.ordem::integer
    FROM agendamentos_professores ap
    LEFT JOIN metricas_professores mp ON ap.usuario_id = mp.usuario_id
    ORDER BY score ASC, ap.ordem ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
