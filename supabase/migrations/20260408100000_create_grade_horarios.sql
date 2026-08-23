-- Migração para criação do Quadro de Horários dos Professores (Escola Integral e Noturna)

-- 1. Adicionar controle de visibilidade do módulo nas configurações da instituição
ALTER TABLE public.configuracoes_instituicao 
ADD COLUMN IF NOT EXISTS modulo_horarios_ativo BOOLEAN DEFAULT true;

-- 2. Adicionar turno na tabela de turmas (Integral e Noturno)
ALTER TABLE public.turmas 
ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'Integral';

-- 3. Criar tabela de alocação de grade de horários
CREATE TABLE IF NOT EXISTS public.grade_horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segmento TEXT NOT NULL, -- 'INTEGRAL_MANHA', 'INTEGRAL_TARDE', 'NOTURNO'
    dia_semana TEXT NOT NULL, -- 'SEG', 'TER', 'QUA', 'QUI', 'SEX'
    numero_aula INTEGER NOT NULL, -- 1 a 5 (Manhã), 6 a 9 (Tarde Integral), 1 a 4 (Noite)
    turma_nome TEXT NOT NULL, -- '1ª A', '1ª B', '2ª A', '3ª C', '1ª E', etc.
    disciplina_nome TEXT NOT NULL,
    disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE SET NULL,
    professor_nome TEXT NOT NULL,
    professor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    cor_destaque TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT grade_horarios_slot_unique UNIQUE(segmento, dia_semana, numero_aula, turma_nome)
);

-- Índices para buscas rápidas por turno, professor e turma
CREATE INDEX IF NOT EXISTS idx_grade_horarios_segmento ON public.grade_horarios(segmento);
CREATE INDEX IF NOT EXISTS idx_grade_horarios_dia_aula ON public.grade_horarios(dia_semana, numero_aula);
CREATE INDEX IF NOT EXISTS idx_grade_horarios_professor_id ON public.grade_horarios(professor_id);
CREATE INDEX IF NOT EXISTS idx_grade_horarios_turma_nome ON public.grade_horarios(turma_nome);

-- Enable RLS
ALTER TABLE public.grade_horarios ENABLE ROW LEVEL SECURITY;

-- Leitura pública para todos os usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura de grade_horarios para autenticados" ON public.grade_horarios;
CREATE POLICY "Permitir leitura de grade_horarios para autenticados" ON public.grade_horarios
    FOR SELECT TO authenticated USING (true);

-- Permissão de inserção, edição e exclusão restrita a Administrador e Coordenador
DROP POLICY IF EXISTS "Permitir mod de grade_horarios por admin/coord" ON public.grade_horarios;
CREATE POLICY "Permitir mod de grade_horarios por admin/coord" ON public.grade_horarios
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));
