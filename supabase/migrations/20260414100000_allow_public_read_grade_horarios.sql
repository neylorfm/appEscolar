-- Migração para permitir leitura pública (alunos sem login) do Quadro de Horários e Emergências

-- 1. Leitura pública de grade_horarios para instâncias oficiais publicadas e situações emergenciais
DROP POLICY IF EXISTS "Permitir leitura de grade_horarios para autenticados" ON public.grade_horarios;
DROP POLICY IF EXISTS "Permitir leitura publica de grade_horarios" ON public.grade_horarios;

CREATE POLICY "Permitir leitura publica de grade_horarios" ON public.grade_horarios
    FOR SELECT TO anon, authenticated 
    USING (instancia IN ('PUBLICADA', 'EMERGENCIA_1', 'EMERGENCIA_2', 'EMERGENCIA_3', 'EMERGENCIA_4', 'EMERGENCIA_5'));

-- Mantém a política de modificação restrita apenas a Administradores e Coordenadores autenticados
DROP POLICY IF EXISTS "Permitir mod de grade_horarios por admin/coord" ON public.grade_horarios;
CREATE POLICY "Permitir mod de grade_horarios por admin/coord" ON public.grade_horarios
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));

-- 2. Garantir a existência da tabela de emergências caso ainda não tenha sido criada
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

-- Habilitar RLS na tabela de emergências
ALTER TABLE public.grade_horarios_emergencias ENABLE ROW LEVEL SECURITY;

-- Leitura pública da tabela de emergências
DROP POLICY IF EXISTS "Permitir leitura de emergencias para autenticados" ON public.grade_horarios_emergencias;
DROP POLICY IF EXISTS "Permitir leitura publica de emergencias" ON public.grade_horarios_emergencias;

CREATE POLICY "Permitir leitura publica de emergencias" ON public.grade_horarios_emergencias
    FOR SELECT TO anon, authenticated
    USING (true);

-- Modificação restrita da tabela de emergências para Admin e Coordenador
DROP POLICY IF EXISTS "Permitir atualizacao de emergencias para autenticados" ON public.grade_horarios_emergencias;
DROP POLICY IF EXISTS "Permitir mod de emergencias por admin/coord" ON public.grade_horarios_emergencias;

CREATE POLICY "Permitir mod de emergencias por admin/coord" ON public.grade_horarios_emergencias
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));

-- 3. Adicionar coluna na configuracoes_instituicao caso não exista
ALTER TABLE public.configuracoes_instituicao 
ADD COLUMN IF NOT EXISTS grade_emergencia_ativa_id INT DEFAULT NULL;
