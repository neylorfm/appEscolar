-- Migração para suporte a Pontos de Restauração (Snapshots) da Grade de Horários na Nuvem

CREATE TABLE IF NOT EXISTS public.grade_horarios_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  total_aulas INT NOT NULL DEFAULT 0,
  dados JSONB NOT NULL,
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para ordenação rápida por data
CREATE INDEX IF NOT EXISTS idx_grade_snapshots_created_at 
ON public.grade_horarios_snapshots(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.grade_horarios_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Permitir leitura de snapshots para autenticados"
  ON public.grade_horarios_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir criacao de snapshots para autenticados"
  ON public.grade_horarios_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir exclusao de snapshots para autenticados"
  ON public.grade_horarios_snapshots
  FOR DELETE
  TO authenticated
  USING (true);
