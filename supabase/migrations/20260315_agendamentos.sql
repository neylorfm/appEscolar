-- Adicionar novas configurações
ALTER TABLE public.configuracoes_instituicao
ADD COLUMN IF NOT EXISTS tipo_limite_agendamento text DEFAULT 'Semanas a Frente' CHECK (tipo_limite_agendamento IN ('Data Fixa', 'Semanas a Frente')),
ADD COLUMN IF NOT EXISTS data_limite_agendamento date,
ADD COLUMN IF NOT EXISTS semanas_limite_agendamento integer DEFAULT 4;

-- Criar tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurso_id uuid REFERENCES public.recursos(id) ON DELETE CASCADE NOT NULL,
    horario_id uuid REFERENCES public.horarios(id) ON DELETE CASCADE NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE, -- NULL significa "Escola"
    agendado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL, -- Quem criou o registro
    data_agendamento date NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('Confirmado', 'Pre-Reserva', 'Fixo')),
    status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Cancelado')),
    -- Campos exclusivos para Agendamentos Fixos
    data_inicio_fixo date,
    data_fim_fixo date,
    dia_semana_fixo integer CHECK (dia_semana_fixo >= 0 AND dia_semana_fixo <= 6),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para agendamentos

-- Leitura: Todos os usuários autenticados podem ver os agendamentos
CREATE POLICY "Permitir leitura de agendamentos para usuários logados"
    ON public.agendamentos FOR SELECT
    TO authenticated
    USING (true);

-- Inserção: Autenticados podem inserir
CREATE POLICY "Permitir inserção de agendamentos para usuários logados"
    ON public.agendamentos FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Atualização: Professores atualizam os próprios; Coordenadores/Admins atualizam todos
CREATE POLICY "Permitir update de agendamentos"
    ON public.agendamentos FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = usuario_id
        OR EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE id = auth.uid() AND papel IN ('Coordenador', 'Administrador')
        )
    )
    WITH CHECK (
        auth.uid() = usuario_id
        OR EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE id = auth.uid() AND papel IN ('Coordenador', 'Administrador')
        )
    );

-- Exclusão: Professores excluem os próprios; Coordenadores/Admins excluem todos
CREATE POLICY "Permitir delete de agendamentos"
    ON public.agendamentos FOR DELETE
    TO authenticated
    USING (
        auth.uid() = usuario_id
        OR EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE id = auth.uid() AND papel IN ('Coordenador', 'Administrador')
        )
    );
