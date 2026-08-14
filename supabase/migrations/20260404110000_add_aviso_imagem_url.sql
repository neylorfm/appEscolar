-- Migration: Adicionar campo imagem_url na tabela avisos (apenas armazena a URL da imagem)
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS imagem_url text;
