-- Migration: Adicionar coluna ordem na tabela recursos para suportar ordenação personalizada
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS ordem integer DEFAULT 0;

-- Inicializar ordem sequencial para recursos existentes com base no nome
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY nome ASC) as rn
  FROM public.recursos
)
UPDATE public.recursos r
SET ordem = ranked.rn
FROM ranked
WHERE r.id = ranked.id;
