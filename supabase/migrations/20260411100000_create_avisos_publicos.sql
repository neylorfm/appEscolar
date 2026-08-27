-- Migration para Área Pública (Avisos Externos)
-- Tabela dedicada e isolada para divulgação de comunicados para a comunidade escolar

CREATE TABLE IF NOT EXISTS public.avisos_publicos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    conteudo text NOT NULL,
    imagem_url text,
    link text,
    categoria text DEFAULT 'COMUNICADO',
    ordem integer DEFAULT 0,
    data_publicacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    autor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.avisos_publicos ENABLE ROW LEVEL SECURITY;

-- 1. Leitura pública liberada para todos (inclusive visitantes anônimos sem login)
DROP POLICY IF EXISTS "Permitir leitura pública de avisos_publicos para todos" ON public.avisos_publicos;
CREATE POLICY "Permitir leitura pública de avisos_publicos para todos" ON public.avisos_publicos
    FOR SELECT TO anon, authenticated USING (true);

-- 2. Modificações (INSERT, UPDATE, DELETE) restritas exclusivamente a Administrador e Coordenador
DROP POLICY IF EXISTS "Permitir mod de avisos_publicos por admin/coord" ON public.avisos_publicos;
CREATE POLICY "Permitir mod de avisos_publicos por admin/coord" ON public.avisos_publicos
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));
