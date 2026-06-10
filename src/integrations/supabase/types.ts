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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campanha_lojas: {
        Row: {
          campanha_id: string
          id: string
          loja_id: string
        }
        Insert: {
          campanha_id: string
          id?: string
          loja_id: string
        }
        Update: {
          campanha_id?: string
          id?: string
          loja_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_lojas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_lojas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_promotores: {
        Row: {
          campanha_id: string
          id: string
          promotor_id: string
        }
        Insert: {
          campanha_id: string
          id?: string
          promotor_id: string
        }
        Update: {
          campanha_id?: string
          id?: string
          promotor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_promotores_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["campanha_status"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["campanha_status"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["campanha_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          campanha_id: string | null
          created_at: string
          distancia_metros: number | null
          hora_entrada: string
          hora_saida: string | null
          id: string
          latitude_entrada: number
          latitude_saida: number | null
          loja_id: string
          longitude_entrada: number
          longitude_saida: number | null
          observacoes: string | null
          promotor_id: string
          selfie_url: string
        }
        Insert: {
          campanha_id?: string | null
          created_at?: string
          distancia_metros?: number | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          latitude_entrada: number
          latitude_saida?: number | null
          loja_id: string
          longitude_entrada: number
          longitude_saida?: number | null
          observacoes?: string | null
          promotor_id: string
          selfie_url: string
        }
        Update: {
          campanha_id?: string | null
          created_at?: string
          distancia_metros?: number | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          latitude_entrada?: number
          latitude_saida?: number | null
          loja_id?: string
          longitude_entrada?: number
          longitude_saida?: number | null
          observacoes?: string | null
          promotor_id?: string
          selfie_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          email_contato: string | null
          id: string
          nome: string
          responsavel: string | null
          telefone: string | null
          tipo_cobranca: string | null
          updated_at: string
          valor_diaria_cobrada: number | null
          valor_hora_cobrada: number | null
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          telefone?: string | null
          tipo_cobranca?: string | null
          updated_at?: string
          valor_diaria_cobrada?: number | null
          valor_hora_cobrada?: number | null
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          telefone?: string | null
          tipo_cobranca?: string | null
          updated_at?: string
          valor_diaria_cobrada?: number | null
          valor_hora_cobrada?: number | null
          valor_mensal?: number | null
        }
        Relationships: []
      }
      escalas: {
        Row: {
          campanha_id: string | null
          check_in_id: string | null
          created_at: string
          data: string
          diarias: number
          duracao_horas: number
          hora_fim: string
          hora_inicio: string
          id: string
          loja_id: string
          observacoes: string | null
          promotor_id: string
          status: string
          turno: number
          updated_at: string
        }
        Insert: {
          campanha_id?: string | null
          check_in_id?: string | null
          created_at?: string
          data: string
          diarias?: number
          duracao_horas: number
          hora_fim: string
          hora_inicio: string
          id?: string
          loja_id: string
          observacoes?: string | null
          promotor_id: string
          status?: string
          turno?: number
          updated_at?: string
        }
        Update: {
          campanha_id?: string | null
          check_in_id?: string | null
          created_at?: string
          data?: string
          diarias?: number
          duracao_horas?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          loja_id?: string
          observacoes?: string | null
          promotor_id?: string
          status?: string
          turno?: number
          updated_at?: string
        }
        Relationships: []
      }
      execucoes: {
        Row: {
          check_in_id: string
          created_at: string
          id: string
          loja_id: string
          loja_organizada: boolean | null
          material_merchandising: boolean | null
          observacoes: string | null
          preco_visivel: boolean | null
          produto_exposto: boolean | null
          promotor_id: string
          score: number | null
        }
        Insert: {
          check_in_id: string
          created_at?: string
          id?: string
          loja_id: string
          loja_organizada?: boolean | null
          material_merchandising?: boolean | null
          observacoes?: string | null
          preco_visivel?: boolean | null
          produto_exposto?: boolean | null
          promotor_id: string
          score?: number | null
        }
        Update: {
          check_in_id?: string
          created_at?: string
          id?: string
          loja_id?: string
          loja_organizada?: boolean | null
          material_merchandising?: boolean | null
          observacoes?: string | null
          preco_visivel?: boolean | null
          produto_exposto?: boolean | null
          promotor_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas_clientes: {
        Row: {
          campanha_id: string | null
          cliente_id: string
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string | null
          id: string
          numero_fatura: string | null
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          total_diarias: number
          total_horas: number
          updated_at: string
          valor_total: number
        }
        Insert: {
          campanha_id?: string | null
          cliente_id: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          numero_fatura?: string | null
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          total_diarias?: number
          total_horas?: number
          updated_at?: string
          valor_total?: number
        }
        Update: {
          campanha_id?: string | null
          cliente_id?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          numero_fatura?: string | null
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          total_diarias?: number
          total_horas?: number
          updated_at?: string
          valor_total?: number
        }
        Relationships: []
      }
      fechamentos_mensais: {
        Row: {
          ano: number
          created_at: string
          fechado_em: string
          fechado_por: string
          id: string
          mes: number
          observacoes: string | null
          reaberto_em: string | null
          reaberto_por: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          fechado_em?: string
          fechado_por: string
          id?: string
          mes: number
          observacoes?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          fechado_em?: string
          fechado_por?: string
          id?: string
          mes?: number
          observacoes?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
        }
        Relationships: []
      }
      fotos_execucao: {
        Row: {
          check_in_id: string | null
          created_at: string
          execucao_id: string | null
          foto_url: string
          id: string
          legenda: string | null
          loja_id: string
          promotor_id: string
          taken_at: string
          tipo: string
        }
        Insert: {
          check_in_id?: string | null
          created_at?: string
          execucao_id?: string | null
          foto_url: string
          id?: string
          legenda?: string | null
          loja_id: string
          promotor_id: string
          taken_at?: string
          tipo: string
        }
        Update: {
          check_in_id?: string | null
          created_at?: string
          execucao_id?: string | null
          foto_url?: string
          id?: string
          legenda?: string | null
          loja_id?: string
          promotor_id?: string
          taken_at?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_execucao_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_execucao_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_execucao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cliente_id: string
          codigo: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          maps_link: string | null
          nome: string
          raio_metros: number
          requer_execucao: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cliente_id: string
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_link?: string | null
          nome: string
          raio_metros?: number
          requer_execucao?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cliente_id?: string
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_link?: string | null
          nome?: string
          raio_metros?: number
          requer_execucao?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lojas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string | null
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo?: string | null
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string | null
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      pagamentos_promotores: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          forma_pagamento: string | null
          horas_extras: number
          id: string
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          promotor_id: string
          status: string
          total_diarias: number
          total_turnos: number
          updated_at: string
          valor_diarias: number
          valor_extras: number
          valor_total: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          horas_extras?: number
          id?: string
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          promotor_id: string
          status?: string
          total_diarias?: number
          total_turnos?: number
          updated_at?: string
          valor_diarias?: number
          valor_extras?: number
          valor_total?: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          horas_extras?: number
          id?: string
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          promotor_id?: string
          status?: string
          total_diarias?: number
          total_turnos?: number
          updated_at?: string
          valor_diarias?: number
          valor_extras?: number
          valor_total?: number
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          cliente_id: string
          created_at: string
          id: string
          marca: string | null
          nome: string
          sku: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          cliente_id: string
          created_at?: string
          id?: string
          marca?: string | null
          nome: string
          sku?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          cliente_id?: string
          created_at?: string
          id?: string
          marca?: string | null
          nome?: string
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cliente_id: string | null
          created_at: string
          email: string
          id: string
          jornada_horas: number | null
          loja_fixa_id: string | null
          marcas_atendidas: string[] | null
          nome: string
          rota_lojas: string[] | null
          telefone: string | null
          tipo_promotor: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cliente_id?: string | null
          created_at?: string
          email: string
          id: string
          jornada_horas?: number | null
          loja_fixa_id?: string | null
          marcas_atendidas?: string[] | null
          nome: string
          rota_lojas?: string[] | null
          telefone?: string | null
          tipo_promotor?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cliente_id?: string | null
          created_at?: string
          email?: string
          id?: string
          jornada_horas?: number | null
          loja_fixa_id?: string | null
          marcas_atendidas?: string[] | null
          nome?: string
          rota_lojas?: string[] | null
          telefone?: string | null
          tipo_promotor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cliente_fk"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_financeiro: {
        Row: {
          chave_pix: string | null
          cpf: string | null
          created_at: string
          forma_pagamento: string | null
          id: string
          permite_dupla_diaria: boolean | null
          updated_at: string
          valor_diaria: number | null
          valor_hora_extra: number | null
        }
        Insert: {
          chave_pix?: string | null
          cpf?: string | null
          created_at?: string
          forma_pagamento?: string | null
          id: string
          permite_dupla_diaria?: boolean | null
          updated_at?: string
          valor_diaria?: number | null
          valor_hora_extra?: number | null
        }
        Update: {
          chave_pix?: string | null
          cpf?: string | null
          created_at?: string
          forma_pagamento?: string | null
          id?: string
          permite_dupla_diaria?: boolean | null
          updated_at?: string
          valor_diaria?: number | null
          valor_hora_extra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_financeiro_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rupturas: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          observacoes: string | null
          produto_id: string
          promotor_id: string
          quantidade_atual: number
          resolvida_em: string | null
          status: Database["public"]["Enums"]["ruptura_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          observacoes?: string | null
          produto_id: string
          promotor_id: string
          quantidade_atual?: number
          resolvida_em?: string | null
          status?: Database["public"]["Enums"]["ruptura_status"]
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          observacoes?: string | null
          produto_id?: string
          promotor_id?: string
          quantidade_atual?: number
          resolvida_em?: string | null
          status?: Database["public"]["Enums"]["ruptura_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rupturas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rupturas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validades: {
        Row: {
          created_at: string
          data_validade: string
          foto_url: string | null
          id: string
          loja_id: string
          observacoes: string | null
          produto_id: string
          promotor_id: string
          quantidade: number | null
        }
        Insert: {
          created_at?: string
          data_validade: string
          foto_url?: string | null
          id?: string
          loja_id: string
          observacoes?: string | null
          produto_id: string
          promotor_id: string
          quantidade?: number | null
        }
        Update: {
          created_at?: string
          data_validade?: string
          foto_url?: string | null
          id?: string
          loja_id?: string
          observacoes?: string | null
          produto_id?: string
          promotor_id?: string
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "validades_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validades_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      resumo_financeiro_mensal: {
        Row: {
          lucro: number | null
          mes: string | null
          total_pagar_promotores: number | null
          total_receber_clientes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_cliente_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mes_fechado: { Args: { _data: string }; Returns: boolean }
      user_can_access_campanha: {
        Args: { _campanha_id: string }
        Returns: boolean
      }
      user_can_access_campanha_promotor: {
        Args: { _campanha_id: string; _promotor_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "contratante" | "promotor"
      campanha_status: "rascunho" | "ativa" | "pausada" | "concluida"
      ruptura_status: "aberta" | "resolvida"
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
      app_role: ["admin", "contratante", "promotor"],
      campanha_status: ["rascunho", "ativa", "pausada", "concluida"],
      ruptura_status: ["aberta", "resolvida"],
    },
  },
} as const
