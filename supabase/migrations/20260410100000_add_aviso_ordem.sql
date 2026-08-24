-- Migration: Adicionar coluna ordem para reordenação de avisos por Admin e Coordenador
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS ordem integer DEFAULT 0;
