export interface ConfiguracoesInstituicao {
  id: string
  nome_instituicao: string
  logo_url: string | null
  cor_principal: string
  cor_secundaria_1: string
  cor_secundaria_2: string
  cor_destaque_1: string
  cor_destaque_2: string
  timeout_professor_min: number
  timeout_coordenador_min: number
  timeout_administrador_min: number
  semanas_limite_agendamento: number
  tipo_limite_agendamento: string
  data_limite_agendamento: string | null
  cor_login_background?: string
  cor_login_text?: string
  cor_login_form_background?: string
  cor_login_form_text?: string
}
