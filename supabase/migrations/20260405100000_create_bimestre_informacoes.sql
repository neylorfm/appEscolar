-- Migration para Card de Informações por Bimestre (1º, 2º, 3º, 4º Bimestre)

CREATE TABLE IF NOT EXISTS public.bimestre_informacoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bimestre integer NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
    titulo text NOT NULL,
    link text,
    descricao text,
    ordem integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index para buscas rápidas filtradas por bimestre
CREATE INDEX IF NOT EXISTS idx_bimestre_informacoes_bimestre ON public.bimestre_informacoes (bimestre, ordem ASC, created_at DESC);

-- Enable RLS
ALTER TABLE public.bimestre_informacoes ENABLE ROW LEVEL SECURITY;

-- Leitura pública para todos os usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura de informacoes bimestrais para autenticados" ON public.bimestre_informacoes;
CREATE POLICY "Permitir leitura de informacoes bimestrais para autenticados" ON public.bimestre_informacoes
    FOR SELECT TO authenticated USING (true);

-- Permissão de inserção, edição e exclusão restrita a Administrador e Coordenador
DROP POLICY IF EXISTS "Permitir mod de informacoes bimestrais por admin/coord" ON public.bimestre_informacoes;
CREATE POLICY "Permitir mod de informacoes bimestrais por admin/coord" ON public.bimestre_informacoes
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));
