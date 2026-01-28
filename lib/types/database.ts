export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'closer'
export type ParticipantColor = 'rosa' | 'preto' | 'azul_claro' | 'dourado' | 'laranja'
export type Qualification = 'super' | 'medio' | 'baixo'
export type DiscProfile = 'D' | 'I' | 'S' | 'C'

export interface Database {
  public: {
    Tables: {
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
          name: string
          photo_url: string | null
          revenue: string | null
          niche: string | null
          color: ParticipantColor | null
          instagram: string | null
          webhook_data: Json | null
          funnel: string | null
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
          // Archetype fields (visible to participant)
          primary_archetype: string | null
          secondary_archetype: string | null
          archetype_description: string | null
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          photo_url?: string | null
          revenue?: string | null
          niche?: string | null
          color?: ParticipantColor | null
          instagram?: string | null
          webhook_data?: Json | null
          funnel?: string | null
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
          primary_archetype?: string | null
          secondary_archetype?: string | null
          archetype_description?: string | null
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          photo_url?: string | null
          revenue?: string | null
          niche?: string | null
          color?: ParticipantColor | null
          instagram?: string | null
          webhook_data?: Json | null
          funnel?: string | null
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
          primary_archetype?: string | null
          secondary_archetype?: string | null
          archetype_description?: string | null
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
          created_at?: string
          updated_at?: string
        }
      }
      forms: {
        Row: {
          id: string
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
          participant_id: string
          closer_id: string
          product: string
          total_value: number
          entry_value: number
          negotiation_type: string
          created_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          closer_id: string
          product: string
          total_value: number
          entry_value: number
          negotiation_type: string
          created_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          closer_id?: string
          product?: string
          total_value?: number
          entry_value?: number
          negotiation_type?: string
          created_at?: string
        }
      }
      webhooks_log: {
        Row: {
          id: string
          payload: Json
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          payload: Json
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          processed?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Helper types for easier use
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
}

export interface CloserWithStats extends User {
  participants_count: number
  opportunities_count: number
  sales_count: number
  conversion_rate: number
  total_sales_value: number
  total_entry_value: number
}
