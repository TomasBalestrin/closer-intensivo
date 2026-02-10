export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'closer' | 'financeiro'
export type ParticipantColor = 'rosa' | 'preto' | 'azul_claro' | 'verde' | 'dourado' | 'laranja'
export type Qualification = 'baixo' | 'medio' | 'alto'
export type DiscProfile = 'D' | 'I' | 'S' | 'C'
export type EventStatus = 'ativo' | 'arquivado' | 'rascunho'

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          nome_evento: string
          slug: string
          data_inicio: string
          data_fim: string
          numero_dias: number
          local: string
          cidade: string | null
          estado: string | null
          descricao: string | null
          capacidade_maxima: number | null
          logo_url: string | null
          cor_primaria: string
          cor_secundaria: string
          status: EventStatus
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          nome_evento: string
          slug: string
          data_inicio: string
          data_fim: string
          local: string
          cidade?: string | null
          estado?: string | null
          descricao?: string | null
          capacidade_maxima?: number | null
          logo_url?: string | null
          cor_primaria?: string
          cor_secundaria?: string
          status?: EventStatus
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          nome_evento?: string
          slug?: string
          data_inicio?: string
          data_fim?: string
          local?: string
          cidade?: string | null
          estado?: string | null
          descricao?: string | null
          capacidade_maxima?: number | null
          logo_url?: string | null
          cor_primaria?: string
          cor_secundaria?: string
          status?: EventStatus
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      user_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          role?: UserRole
          created_at?: string
        }
      }
      funis_origem: {
        Row: {
          id: string
          event_id: string
          nome: string
          slug: string
          ativo: boolean
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          nome: string
          slug: string
          ativo?: boolean
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          nome?: string
          slug?: string
          ativo?: boolean
          ordem?: number
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          event_id: string
          user_id: string
          acao: string
          tabela_afetada: string
          registro_id: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          motivo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          acao: string
          tabela_afetada: string
          registro_id: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          motivo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          acao?: string
          tabela_afetada?: string
          registro_id?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          motivo?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: UserRole
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: UserRole
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: UserRole
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          event_id: string | null
          external_id: string | null
          name: string
          email: string | null
          phone: string | null
          photo_url: string | null
          revenue: string | null
          niche: string | null
          color: ParticipantColor | null
          instagram: string | null
          webhook_data: Json | null
          funnel: string | null
          funil_origem_id: string | null
          seller_closer_id: string | null
          mentee_inviter: string | null
          companion: string | null
          is_opportunity: boolean
          closer_id: string | null
          times_called: number
          checked_in_day1: boolean
          checked_in_day2: boolean
          checked_in_day3: boolean
          qualification: Qualification | null
          // Campos de "chamado"
          chamado: boolean
          chamado_at: string | null
          chamado_by: string | null
          // Archetype fields (visible to participant)
          primary_archetype: string | null
          secondary_archetype: string | null
          archetype_description: string | null
          archetype_scores: Json | null
          // DISC fields (hidden - only for closers)
          disc_profile: string | null
          disc_score_d: number | null
          disc_score_i: number | null
          disc_score_s: number | null
          disc_score_c: number | null
          disc_analysis: Json | null
          // Sales insights (hidden - only for closers)
          personality_summary: string | null
          sales_approach: Json | null
          decision_triggers: Json | null
          predicted_objections: Json | null
          closing_strategies: Json | null
          things_to_avoid: string[] | null
          quick_tips: string[] | null
          // Open answers
          challenge_answer: string | null
          desired_change_answer: string | null
          form_completed_at: string | null
          // Extra fields (manual entry)
          cpf: string | null
          badge_name: string | null
          net_profit: string | null
          partner: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          external_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          photo_url?: string | null
          revenue?: string | null
          niche?: string | null
          color?: ParticipantColor | null
          instagram?: string | null
          webhook_data?: Json | null
          funnel?: string | null
          funil_origem_id?: string | null
          seller_closer_id?: string | null
          mentee_inviter?: string | null
          companion?: string | null
          is_opportunity?: boolean
          closer_id?: string | null
          times_called?: number
          checked_in_day1?: boolean
          checked_in_day2?: boolean
          checked_in_day3?: boolean
          qualification?: Qualification | null
          chamado?: boolean
          chamado_at?: string | null
          chamado_by?: string | null
          primary_archetype?: string | null
          secondary_archetype?: string | null
          archetype_description?: string | null
          archetype_scores?: Json | null
          disc_profile?: string | null
          disc_score_d?: number | null
          disc_score_i?: number | null
          disc_score_s?: number | null
          disc_score_c?: number | null
          disc_analysis?: Json | null
          personality_summary?: string | null
          sales_approach?: Json | null
          decision_triggers?: Json | null
          predicted_objections?: Json | null
          closing_strategies?: Json | null
          things_to_avoid?: string[] | null
          quick_tips?: string[] | null
          challenge_answer?: string | null
          desired_change_answer?: string | null
          form_completed_at?: string | null
          cpf?: string | null
          badge_name?: string | null
          net_profit?: string | null
          partner?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string | null
          external_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          photo_url?: string | null
          revenue?: string | null
          niche?: string | null
          color?: ParticipantColor | null
          instagram?: string | null
          webhook_data?: Json | null
          funnel?: string | null
          funil_origem_id?: string | null
          seller_closer_id?: string | null
          mentee_inviter?: string | null
          companion?: string | null
          is_opportunity?: boolean
          closer_id?: string | null
          times_called?: number
          checked_in_day1?: boolean
          checked_in_day2?: boolean
          checked_in_day3?: boolean
          qualification?: Qualification | null
          chamado?: boolean
          chamado_at?: string | null
          chamado_by?: string | null
          primary_archetype?: string | null
          secondary_archetype?: string | null
          archetype_description?: string | null
          archetype_scores?: Json | null
          disc_profile?: string | null
          disc_score_d?: number | null
          disc_score_i?: number | null
          disc_score_s?: number | null
          disc_score_c?: number | null
          disc_analysis?: Json | null
          personality_summary?: string | null
          sales_approach?: Json | null
          decision_triggers?: Json | null
          predicted_objections?: Json | null
          closing_strategies?: Json | null
          things_to_avoid?: string[] | null
          quick_tips?: string[] | null
          challenge_answer?: string | null
          desired_change_answer?: string | null
          form_completed_at?: string | null
          cpf?: string | null
          badge_name?: string | null
          net_profit?: string | null
          partner?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      forms: {
        Row: {
          id: string
          event_id: string | null
          participant_id: string
          form_url: string
          responses: Json | null
          disc_profile: DiscProfile | null
          disc_description: string | null
          sales_insights: string | null
          objections: string | null
          objection_handling: string | null
          closing_examples: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          participant_id: string
          form_url: string
          responses?: Json | null
          disc_profile?: DiscProfile | null
          disc_description?: string | null
          sales_insights?: string | null
          objections?: string | null
          objection_handling?: string | null
          closing_examples?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          participant_id?: string
          form_url?: string
          responses?: Json | null
          disc_profile?: DiscProfile | null
          disc_description?: string | null
          sales_insights?: string | null
          objections?: string | null
          objection_handling?: string | null
          closing_examples?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      sales: {
        Row: {
          id: string
          event_id: string | null
          participant_id: string
          closer_id: string
          closer_nome: string | null
          product_name: string
          total_value: number
          entry_value: number
          valor_proxima_semana: number
          negotiation_type: string
          dia_evento: number | null
          observacoes: string | null
          deleted_at: string | null
          deleted_by: string | null
          motivo_remocao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          participant_id: string
          closer_id: string
          closer_nome?: string | null
          product_name: string
          total_value: number
          entry_value: number
          valor_proxima_semana?: number
          negotiation_type: string
          dia_evento?: number | null
          observacoes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          motivo_remocao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string | null
          participant_id?: string
          closer_id?: string
          closer_nome?: string | null
          product_name?: string
          total_value?: number
          entry_value?: number
          valor_proxima_semana?: number
          negotiation_type?: string
          dia_evento?: number | null
          observacoes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          motivo_remocao?: string | null
          created_at?: string
        }
      }
      webhooks_log: {
        Row: {
          id: string
          event_id: string | null
          payload: Json
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          payload: Json
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string | null
          payload?: Json
          processed?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Helper types for easier use
export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type UserEvent = Database['public']['Tables']['user_events']['Row']
export type UserEventInsert = Database['public']['Tables']['user_events']['Insert']
export type UserEventUpdate = Database['public']['Tables']['user_events']['Update']

export type FunilOrigem = Database['public']['Tables']['funis_origem']['Row']
export type FunilOrigemInsert = Database['public']['Tables']['funis_origem']['Insert']
export type FunilOrigemUpdate = Database['public']['Tables']['funis_origem']['Update']

export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Participant = Database['public']['Tables']['participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']

export type Form = Database['public']['Tables']['forms']['Row']
export type FormInsert = Database['public']['Tables']['forms']['Insert']
export type FormUpdate = Database['public']['Tables']['forms']['Update']

export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleInsert = Database['public']['Tables']['sales']['Insert']
export type SaleUpdate = Database['public']['Tables']['sales']['Update']

export type WebhookLog = Database['public']['Tables']['webhooks_log']['Row']
export type WebhookLogInsert = Database['public']['Tables']['webhooks_log']['Insert']

// Extended types with relations
export interface ParticipantWithRelations extends Participant {
  closer?: User | null
  seller_closer?: User | null
  forms?: Form[]
  sales?: Sale[]
  funil_origem?: FunilOrigem | null
}

export interface CloserWithStats extends User {
  participants_count: number
  opportunities_count: number
  sales_count: number
  conversion_rate: number
  total_sales_value: number
  total_entry_value: number
}

export interface EventWithStats extends Event {
  participants_count: number
  sales_count: number
  total_sales_value: number
  closers_count: number
}

// Card status for visual styling
export type ParticipantCardStatus = 'padrao' | 'chamado' | 'venda'

export function getParticipantCardStatus(
  participant: Participant,
  hasSale: boolean
): ParticipantCardStatus {
  if (hasSale) return 'venda'
  if (participant.chamado) return 'chamado'
  return 'padrao'
}

export const CARD_STATUS_STYLES: Record<ParticipantCardStatus, string> = {
  padrao: 'bg-white border border-gray-200',
  chamado: 'bg-yellow-50 border-l-4 border-l-yellow-400 border-y border-r border-gray-200',
  venda: 'bg-green-50 border-l-4 border-l-green-500 border-y border-r border-gray-200',
}
