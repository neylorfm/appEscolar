-- Migration: Criação da tabela de Tutoriais
-- Permissões:
--  - Professores: visualização (SELECT)
--  - Coordenadores e Administradores: criar, editar, excluir (INSERT, UPDATE, DELETE)

CREATE TABLE IF NOT EXISTS public.tutoriais (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    conteudo text NOT NULL,
    link text,
    ordem integer DEFAULT 0,
    autor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tutoriais ENABLE ROW LEVEL SECURITY;

-- 1. Política de Leitura: Usuários autenticados (Professores, Coordenadores, Administradores)
DROP POLICY IF EXISTS "Permitir leitura de tutoriais para usuarios autenticados" ON public.tutoriais;
CREATE POLICY "Permitir leitura de tutoriais para usuarios autenticados" ON public.tutoriais
    FOR SELECT TO authenticated 
    USING (true);

-- 2. Política de Modificação: Somente Coordenadores e Administradores
DROP POLICY IF EXISTS "Permitir mod de tutoriais por admin e coordenador" ON public.tutoriais;
CREATE POLICY "Permitir mod de tutoriais por admin e coordenador" ON public.tutoriais
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND papel IN ('Administrador', 'Coordenador')
        )
    );
