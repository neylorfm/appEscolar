export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          agendado_por: string | null
          created_at: string
          data_agendamento: string
          data_fim_fixo: string | null
          data_inicio_fixo: string | null
          dia_semana_fixo: number | null
          horario_id: string
          id: string
          recurso_id: string
          status: string
          tipo: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          agendado_por?: string | null
          created_at?: string
          data_agendamento: string
          data_fim_fixo?: string | null
          data_inicio_fixo?: string | null
          dia_semana_fixo?: number | null
          horario_id: string
          id?: string
          recurso_id: string
          status?: string
          tipo: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          agendado_por?: string | null
          created_at?: string
          data_agendamento?: string
          data_fim_fixo?: string | null
          data_inicio_fixo?: string | null
          dia_semana_fixo?: number | null
          horario_id?: string
          id?: string
          recurso_id?: string
          status?: string
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_agendado_por_fkey"
            columns: ["agendado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          id: string
          nome: string
          pcas: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          pcas?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          pcas?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_instituicao: {
        Row: {
          cor_destaque_1: string | null
          cor_destaque_2: string | null
          cor_principal: string | null
          cor_secundaria_1: string | null
          cor_secundaria_2: string | null
          created_at: string
          data_limite_agendamento: string | null
          id: string
          logo_url: string | null
          nome_instituicao: string
          semanas_limite_agendamento: number | null
          timeout_administrador_min: number
          timeout_coordenador_min: number
          timeout_professor_min: number
          tipo_limite_agendamento: string | null
          updated_at: string
        }
        Insert: {
          cor_destaque_1?: string | null
          cor_destaque_2?: string | null
          cor_principal?: string | null
          cor_secundaria_1?: string | null
          cor_secundaria_2?: string | null
          created_at?: string
          data_limite_agendamento?: string | null
          id?: string
          logo_url?: string | null
          nome_instituicao?: string
          semanas_limite_agendamento?: number | null
          timeout_administrador_min?: number
          timeout_coordenador_min?: number
          timeout_professor_min?: number
          tipo_limite_agendamento?: string | null
          updated_at?: string
        }
        Update: {
          cor_destaque_1?: string | null
          cor_destaque_2?: string | null
          cor_principal?: string | null
          cor_secundaria_1?: string | null
          cor_secundaria_2?: string | null
          created_at?: string
          data_limite_agendamento?: string | null
          id?: string
          logo_url?: string | null
          nome_instituicao?: string
          semanas_limite_agendamento?: number | null
          timeout_administrador_min?: number
          timeout_coordenador_min?: number
          timeout_professor_min?: number
          tipo_limite_agendamento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      disciplinas: {
        Row: {
          area_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          created_at: string
          fim: string
          id: string
          inicio: string
          label: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fim: string
          id?: string
          inicio: string
          label: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          label?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      professor_disciplinas: {
        Row: {
          created_at: string
          disciplina_id: string
          id: string
          professor_id: string
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          id?: string
          professor_id: string
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          id?: string
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_disciplinas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_disciplinas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos: {
        Row: {
          ativo: boolean | null
          created_at: string
          detalhes: string | null
          icone: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          detalhes?: string | null
          icone?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          detalhes?: string | null
          icone?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          serie: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          serie: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          serie?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          apelido: string | null
          ativo: boolean | null
          created_at: string
          email: string
          foto_url: string | null
          id: string
          nome_completo: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          ativo?: boolean | null
          created_at?: string
          email: string
          foto_url?: string | null
          id: string
          nome_completo?: string | null
          papel?: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          ativo?: boolean | null
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome_completo?: string | null
          papel?: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_fila_pre_reserva: {
        Args: { p_data: string; p_horario_id: string; p_recurso_id: string }
        Returns: {
          agendamento_id: string
          data_agendamento: string
          nome_professor: string
          ordem: number
          quantidade_agendamentos: number
          quantidade_cancelamentos: number
          score: number
          usuario_id: string
        }[]
      }
    }
    Enums: {
      papel_usuario: "Administrador" | "Coordenador" | "Professor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      papel_usuario: ["Administrador", "Coordenador", "Professor"],
    },
  },
} as const
