-- Migration para Dashboard: Quicklinks e Avisos

CREATE TABLE IF NOT EXISTS public.quicklinks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    url text NOT NULL,
    icone text,
    ordem integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.avisos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    conteudo text NOT NULL,
    data_publicacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    autor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quicklinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- Policies for quicklinks
-- Everyone can select
CREATE POLICY "Permitir leitura de quicklinks para todos" ON public.quicklinks
    FOR SELECT TO authenticated USING (true);

-- Only Admin and Coordinator can insert, update, delete
CREATE POLICY "Permitir mod de quicklinks por admin/coord" ON public.quicklinks
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));

-- Policies for avisos
-- Everyone can select
CREATE POLICY "Permitir leitura de avisos para todos" ON public.avisos
    FOR SELECT TO authenticated USING (true);

-- Only Admin and Coordinator can insert, update, delete
CREATE POLICY "Permitir mod de avisos por admin/coord" ON public.avisos
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')));
