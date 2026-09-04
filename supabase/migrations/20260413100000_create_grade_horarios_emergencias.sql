-- Migração para suporte a Horários Temporários e Emergenciais (5 Situações Flexíveis)

CREATE TABLE IF NOT EXISTS public.grade_horarios_emergencias (
  id INT PRIMARY KEY, -- 1 a 5
  instancia_key TEXT NOT NULL UNIQUE, -- 'EMERGENCIA_1' a 'EMERGENCIA_5'
  titulo TEXT NOT NULL,
  motivo TEXT,
  dias_afetados JSONB NOT NULL DEFAULT '["SEG","TER","QUA","QUI","SEX"]'::jsonb,
  texto_vigencia TEXT,
  ativa BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.grade_horarios_emergencias ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura de emergencias para autenticados" ON public.grade_horarios_emergencias;
CREATE POLICY "Permitir leitura de emergencias para autenticados"
  ON public.grade_horarios_emergencias
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao de emergencias para autenticados" ON public.grade_horarios_emergencias;
CREATE POLICY "Permitir atualizacao de emergencias para autenticados"
  ON public.grade_horarios_emergencias
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Adicionar campo na configuracoes_instituicao para registrar a situação ativa globalmente
ALTER TABLE public.configuracoes_instituicao 
ADD COLUMN IF NOT EXISTS grade_emergencia_ativa_id INT DEFAULT NULL;
