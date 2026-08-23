-- Migration: Adicionar coluna motivo na tabela agendamentos (essencial para agendamentos fixos e projetos)
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS motivo text;
