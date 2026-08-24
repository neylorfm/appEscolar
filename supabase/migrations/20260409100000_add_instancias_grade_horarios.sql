-- Migração para suporte a Instâncias de Horários (Visualização / Edição)

-- 1. Adicionar coluna instancia na tabela grade_horarios
ALTER TABLE public.grade_horarios 
ADD COLUMN IF NOT EXISTS instancia TEXT NOT NULL DEFAULT 'PUBLICADA';

-- 2. Atualizar a restrição de unicidade para considerar a instância
ALTER TABLE public.grade_horarios 
DROP CONSTRAINT IF EXISTS grade_horarios_slot_unique;

ALTER TABLE public.grade_horarios 
DROP CONSTRAINT IF EXISTS grade_horarios_instancia_slot_unique;

ALTER TABLE public.grade_horarios 
ADD CONSTRAINT grade_horarios_instancia_slot_unique 
UNIQUE(instancia, segmento, dia_semana, numero_aula, turma_nome);

-- 3. Criar índice para buscas filtradas por instância
CREATE INDEX IF NOT EXISTS idx_grade_horarios_instancia ON public.grade_horarios(instancia);

-- 4. Adicionar campos de vigência da grade nas configurações da instituição
ALTER TABLE public.configuracoes_instituicao 
ADD COLUMN IF NOT EXISTS grade_vigencia_publicada TEXT DEFAULT 'Válido a partir de 05/02/2026 • 1º Bimestre',
ADD COLUMN IF NOT EXISTS grade_vigencia_rascunho TEXT DEFAULT 'Válido a partir de 05/02/2026 • 1º Bimestre';
