-- Adiciona as colunas de configuração de cor da tela de login
ALTER TABLE "public"."configuracoes_instituicao"
ADD COLUMN "cor_login_background" varchar(50) DEFAULT '#f9fafb',
ADD COLUMN "cor_login_text" varchar(50) DEFAULT '#111827',
ADD COLUMN "cor_login_form_background" varchar(50) DEFAULT '#ffffff',
ADD COLUMN "cor_login_form_text" varchar(50) DEFAULT '#374151';
