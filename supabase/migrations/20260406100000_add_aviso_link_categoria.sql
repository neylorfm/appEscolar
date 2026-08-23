-- Migration: Adicionar campos link e categoria na tabela avisos
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'COMUNICADO';
