-- 1. Garante que a extensão de cron está disponível
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Cria a procedure principal em lote
CREATE OR REPLACE PROCEDURE processar_lote_fila(p_data_inicio DATE, p_data_fim DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_winner_id UUID;
BEGIN
    -- Itera sobre grupos distintos de Pre-Reserva no limite das datas
    FOR r IN (
        SELECT DISTINCT recurso_id, horario_id, data_agendamento
        FROM agendamentos
        WHERE tipo = 'Pre-Reserva'
          AND data_agendamento >= p_data_inicio
          AND data_agendamento <= p_data_fim
    )
    LOOP
        -- Encontra o vencedor usando sua função original get_fila_pre_reserva
        SELECT agendamento_id INTO v_winner_id
        FROM get_fila_pre_reserva(r.recurso_id, r.horario_id, r.data_agendamento)
        LIMIT 1;
        
        IF v_winner_id IS NOT NULL THEN
            -- Promove vencedor
            UPDATE agendamentos 
            SET tipo = 'Confirmado', status = 'Ativo'
            WHERE id = v_winner_id;
            
            -- Deleta perdedores
            DELETE FROM agendamentos 
            WHERE tipo = 'Pre-Reserva' 
              AND data_agendamento = r.data_agendamento 
              AND recurso_id = r.recurso_id 
              AND horario_id = r.horario_id 
              AND id != v_winner_id;
        END IF;
    END LOOP;
END;
$$;

-- 3. Procedure auxiliar: Ação de Quinta-Feira (Processar Sexta)
-- Feito pensando na execução exata às 22h de BRT
CREATE OR REPLACE PROCEDURE processar_amanha_brt()
LANGUAGE plpgsql
AS $$
DECLARE
   v_hoje_brt DATE;
   v_alvo DATE;
BEGIN
   -- Calcula a data real baseada no Fuso de Brasília
   v_hoje_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
   -- O alvo é "amanhã"
   v_alvo := v_hoje_brt + 1;
   
   -- Chama o processamento
   CALL processar_lote_fila(v_alvo, v_alvo);
END;
$$;

-- 4. Procedure auxiliar: Ação de Sexta-Feira (Processar Próxima Semana)
CREATE OR REPLACE PROCEDURE processar_proxima_semana_brt()
LANGUAGE plpgsql
AS $$
DECLARE
   v_hoje_brt DATE;
   v_segunda DATE;
   v_sexta DATE;
BEGIN
   v_hoje_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
   -- Como vai rodar Sexta, a próxima Segunda é Hoje + 3 dias. A próxima Sexta é Hoje + 7 dias.
   v_segunda := v_hoje_brt + 3;
   v_sexta := v_hoje_brt + 7;
   
   CALL processar_lote_fila(v_segunda, v_sexta);
END;
$$;

-- 5. Configurar os Cron Jobs 
-- UTC-3 == Brasília. 
-- Portanto: 22:00 BRT == 01:00 UTC do dia seguinte
-- Atenção: Crie os cron jobs explicitamente como executados pela role postgres se necessário, 
-- mas a extensão cuidará do agendamento básico via função cron.schedule.

-- Job 1: Toda Sexta 01:00 UTC (equivale a Toda Quinta 22:00 BRT)
SELECT cron.schedule('processar_amanha_job', '0 1 * * 5', 'CALL processar_amanha_brt()');

-- Job 2: Todo Sábado 01:00 UTC (equivale a Toda Sexta 22:00 BRT)
SELECT cron.schedule('processar_proxima_semana_job', '0 1 * * 6', 'CALL processar_proxima_semana_brt()');

-- NOTA IMPORTANTE PARA SUPABASE:
-- Se o cron.schedule acima der erro de permissão (ex: apenas o usuário 'postgres' pode rodar),
-- Em projetos Supabase cloud, o usuário default da UI é 'postgres', mas dependendo da versão, 
-- talvez você precise habilitar o pg_cron na tela "Database -> Extensions" antes de rodar isso.
