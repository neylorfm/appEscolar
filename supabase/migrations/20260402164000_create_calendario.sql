-- Migration: Create Calendario Escolar Módulo

CREATE TABLE IF NOT EXISTS public.calendario_anos_letivos (
    ano_letivo SMALLINT PRIMARY KEY,
    inicio_ano DATE NOT NULL,
    fim_ano DATE NOT NULL,
    previsao_proximo_ano DATE NOT NULL,
    periodos JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipos_evento_customizados JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendario_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_letivo SMALLINT NOT NULL REFERENCES public.calendario_anos_letivos(ano_letivo) ON DELETE CASCADE,
    data_evento DATE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    cor VARCHAR(20) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.calendario_anos_letivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_eventos ENABLE ROW LEVEL SECURITY;

-- Leitura Padrão para visualização de todo mundo logado  
CREATE POLICY "Leitura simplificada calendario_anos_letivos" ON public.calendario_anos_letivos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura simplificada calendario_eventos" ON public.calendario_eventos
    FOR SELECT TO authenticated USING (true);

-- Escrita restrita a Coordenação e Admin
CREATE POLICY "Insert apenas Coord_Admin (anos)" ON public.calendario_anos_letivos
    FOR INSERT TO authenticated WITH CHECK (public.check_coord_admin_role());

CREATE POLICY "Update apenas Coord_Admin (anos)" ON public.calendario_anos_letivos
    FOR UPDATE TO authenticated USING (public.check_coord_admin_role());

CREATE POLICY "Delete apenas Coord_Admin (anos)" ON public.calendario_anos_letivos
    FOR DELETE TO authenticated USING (public.check_coord_admin_role());

CREATE POLICY "Insert apenas Coord_Admin (eventos)" ON public.calendario_eventos
    FOR INSERT TO authenticated WITH CHECK (public.check_coord_admin_role());

CREATE POLICY "Update apenas Coord_Admin (eventos)" ON public.calendario_eventos
    FOR UPDATE TO authenticated USING (public.check_coord_admin_role());

CREATE POLICY "Delete apenas Coord_Admin (eventos)" ON public.calendario_eventos
    FOR DELETE TO authenticated USING (public.check_coord_admin_role());

-- Triggers de update
CREATE TRIGGER update_calend_anos_updated_at BEFORE UPDATE ON public.calendario_anos_letivos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_calend_eventos_updated_at BEFORE UPDATE ON public.calendario_eventos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
