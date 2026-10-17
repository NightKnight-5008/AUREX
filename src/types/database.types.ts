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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      card_field_change_history: {
        Row: {
          card_id: string
          changed_at: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          card_id: string
          changed_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          card_id?: string
          changed_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_field_change_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_reliability_metadata: {
        Row: {
          card_id: string
          id: string
          last_updated: string | null
          reliability_score: number | null
        }
        Insert: {
          card_id: string
          id?: string
          last_updated?: string | null
          reliability_score?: number | null
        }
        Update: {
          card_id?: string
          id?: string
          last_updated?: string | null
          reliability_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_reliability_metadata_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          alias_name: string
          billing_cycle_day: number | null
          card_network: string | null
          created_at: string | null
          current_balance: number | null
          due_date: number | null
          id: string
          last_four_digits: string
          limit_amount: number | null
          minimum_payment: number | null
          outstanding_debt: number | null
          payment_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alias_name: string
          billing_cycle_day?: number | null
          card_network?: string | null
          created_at?: string | null
          current_balance?: number | null
          due_date?: number | null
          id?: string
          last_four_digits: string
          limit_amount?: number | null
          minimum_payment?: number | null
          outstanding_debt?: number | null
          payment_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alias_name?: string
          billing_cycle_day?: number | null
          card_network?: string | null
          created_at?: string | null
          current_balance?: number | null
          due_date?: number | null
          id?: string
          last_four_digits?: string
          limit_amount?: number | null
          minimum_payment?: number | null
          outstanding_debt?: number | null
          payment_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          id: string
          key_data: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_data: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_data?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encryption_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_stress_index: {
        Row: {
          calculated_at: string | null
          created_at: string | null
          debt_to_limit_ratio: number | null
          id: string
          payment_history_score: number | null
          stress_score: number | null
          user_id: string
          utilization_rate: number | null
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string | null
          debt_to_limit_ratio?: number | null
          id?: string
          payment_history_score?: number | null
          stress_score?: number | null
          user_id: string
          utilization_rate?: number | null
        }
        Update: {
          calculated_at?: string | null
          created_at?: string | null
          debt_to_limit_ratio?: number | null
          id?: string
          payment_history_score?: number | null
          stress_score?: number | null
          user_id?: string
          utilization_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_stress_index_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      payment_reminders: {
        Row: {
          attempt_count: number | null
          card_id: string | null
          card_last_four: string
          card_name: string | null
          created_at: string | null
          delivery_error: string | null
          delivery_status: string | null
          id: string
          last_attempt_at: string | null
          payment_amount: number
          payment_due_date: string
          payment_status: string | null
          reminder_scheduled_date: string
          reminder_scheduled_time: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          attempt_count?: number | null
          card_id?: string | null
          card_last_four: string
          card_name?: string | null
          created_at?: string | null
          delivery_error?: string | null
          delivery_status?: string | null
          id?: string
          last_attempt_at?: string | null
          payment_amount: number
          payment_due_date: string
          payment_status?: string | null
          reminder_scheduled_date: string
          reminder_scheduled_time?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          attempt_count?: number | null
          card_id?: string | null
          card_last_four?: string
          card_name?: string | null
          created_at?: string | null
          delivery_error?: string | null
          delivery_status?: string | null
          id?: string
          last_attempt_at?: string | null
          payment_amount?: number
          payment_due_date?: string
          payment_status?: string | null
          reminder_scheduled_date?: string
          reminder_scheduled_time?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_credentials: {
        Row: {
          created_at: string | null
          device_id: string
          device_token: string
          id: string
          is_verified: boolean | null
          last_heartbeat: string | null
          updated_at: string | null
          user_id: string
          workspace_username: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_token: string
          id?: string
          is_verified?: boolean | null
          last_heartbeat?: string | null
          updated_at?: string | null
          user_id: string
          workspace_username?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_token?: string
          id?: string
          is_verified?: boolean | null
          last_heartbeat?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      semi_accounts: {
        Row: {
          account_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number: string
          sim_slot: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number: string
          sim_slot?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string
          sim_slot?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semi_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          processed: boolean | null
          received_at: string | null
          semi_account_id: string | null
          sender: string | null
          sms_hash: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          processed?: boolean | null
          received_at?: string | null
          semi_account_id?: string | null
          sender?: string | null
          sms_hash?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          processed?: boolean | null
          received_at?: string | null
          semi_account_id?: string | null
          sender?: string | null
          sms_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          card_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          photo_data: string | null
          transaction_date: string | null
          transaction_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          card_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          photo_data?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          photo_data?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminder_preferences: {
        Row: {
          created_at: string | null
          id: string
          phone_country_code: string | null
          phone_number_encrypted: string
          privacy_notice_accepted: boolean | null
          reminder_time_hour: number | null
          reminders_enabled: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          whatsapp_consent_date: string | null
          whatsapp_consent_given: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_country_code?: string | null
          phone_number_encrypted: string
          privacy_notice_accepted?: boolean | null
          reminder_time_hour?: number | null
          reminders_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_consent_date?: string | null
          whatsapp_consent_given?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_country_code?: string | null
          phone_number_encrypted?: string
          privacy_notice_accepted?: boolean | null
          reminder_time_hour?: number | null
          reminders_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_consent_date?: string | null
          whatsapp_consent_given?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reminder_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          language: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          android_app_password: string | null
          auth_token: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          id: string
          language: string | null
          password_hash: string
          phone_number: string | null
          token_expires_at: string | null
          updated_at: string | null
          verification_code: string | null
          verification_code_expires_at: string | null
        }
        Insert: {
          android_app_password?: string | null
          auth_token?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          id?: string
          language?: string | null
          password_hash: string
          phone_number?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Update: {
          android_app_password?: string | null
          auth_token?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          id?: string
          language?: string | null
          password_hash?: string
          phone_number?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
