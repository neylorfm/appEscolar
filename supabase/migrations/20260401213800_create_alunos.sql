-- Criar tabela de alunos
CREATE TABLE IF NOT EXISTS public.alunos (
    matricula text PRIMARY KEY,
    nome text NOT NULL,
    turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para alunos

-- Leitura: Todos os usuários autenticados podem ver os alunos
CREATE POLICY "Permitir leitura de alunos para usuários logados"
    ON public.alunos FOR SELECT
    TO authenticated
    USING (true);

-- Inserção: Autenticados podem inserir (a interface restrige as páginas de configuração)
CREATE POLICY "Permitir inserção de alunos para usuários logados"
    ON public.alunos FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Atualização: Autenticados podem alterar
CREATE POLICY "Permitir update de alunos"
    ON public.alunos FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Exclusão: Autenticados podem deletar
CREATE POLICY "Permitir delete de alunos"
    ON public.alunos FOR DELETE
    TO authenticated
    USING (true);
