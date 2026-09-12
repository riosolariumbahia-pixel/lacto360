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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          credit_limit: number
          deleted_at: string | null
          deleted_by: string | null
          doc: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          owner_id: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          deleted_by?: string | null
          doc?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          owner_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          deleted_by?: string | null
          doc?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          due_date: string
          id: string
          kind: string
          notes: string | null
          order_id: string | null
          org_id: string
          paid_amount: number
          paid_at: string | null
          payment_method: string | null
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          due_date: string
          id?: string
          kind: string
          notes?: string | null
          order_id?: string | null
          org_id: string
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          due_date?: string
          id?: string
          kind?: string
          notes?: string | null
          order_id?: string | null
          org_id?: string
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_id: string
          id: string
          method: string | null
          notes: string | null
          org_id: string
          paid_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          entry_id: string
          id?: string
          method?: string | null
          notes?: string | null
          org_id: string
          paid_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          org_id?: string
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "finance_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          org_id: string
          sale_price: number
          sku: string | null
          stock_qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          org_id: string
          sale_price?: number
          sku?: string | null
          stock_qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          org_id?: string
          sale_price?: number
          sku?: string | null
          stock_qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          org_id: string
          quantity: number
          reference: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          org_id: string
          quantity: number
          reference?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          org_id?: string
          quantity?: number
          reference?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          onboarded_at: string | null
          owner_id: string
          plan: string
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          onboarded_at?: string | null
          owner_id: string
          plan?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          onboarded_at?: string | null
          owner_id?: string
          plan?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_butter: {
        Row: {
          butter_kg: number
          created_at: string
          created_by: string | null
          id: string
          loss_kg: number
          milk_liters: number
          notes: string | null
          org_id: string
          output_item_id: string | null
          produced_at: string
          total_cost: number
          updated_at: string
          yield_percent: number | null
        }
        Insert: {
          butter_kg?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loss_kg?: number
          milk_liters?: number
          notes?: string | null
          org_id: string
          output_item_id?: string | null
          produced_at?: string
          total_cost?: number
          updated_at?: string
          yield_percent?: number | null
        }
        Update: {
          butter_kg?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loss_kg?: number
          milk_liters?: number
          notes?: string | null
          org_id?: string
          output_item_id?: string | null
          produced_at?: string
          total_cost?: number
          updated_at?: string
          yield_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_butter_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_butter_output_item_id_fkey"
            columns: ["output_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_cheese: {
        Row: {
          cheese_kg: number
          created_at: string
          created_by: string | null
          id: string
          loss_kg: number
          milk_liters: number
          notes: string | null
          org_id: string
          output_item_id: string | null
          pieces: number
          produced_at: string
          total_cost: number
          updated_at: string
          yield_percent: number | null
        }
        Insert: {
          cheese_kg?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loss_kg?: number
          milk_liters?: number
          notes?: string | null
          org_id: string
          output_item_id?: string | null
          pieces?: number
          produced_at?: string
          total_cost?: number
          updated_at?: string
          yield_percent?: number | null
        }
        Update: {
          cheese_kg?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loss_kg?: number
          milk_liters?: number
          notes?: string | null
          org_id?: string
          output_item_id?: string | null
          pieces?: number
          produced_at?: string
          total_cost?: number
          updated_at?: string
          yield_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_cheese_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cheese_output_item_id_fkey"
            columns: ["output_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_commissions: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          org_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          id?: string
          org_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          org_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          order_id: string
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          order_id: string
          quantity: number
          total?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          order_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          channel: string
          code: string
          created_at: string
          customer_id: string
          deleted_at: string | null
          deleted_by: string | null
          delivered_at: string | null
          discount: number
          id: string
          notes: string | null
          ordered_at: string
          org_id: string
          seller_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          channel?: string
          code?: string
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          discount?: number
          id?: string
          notes?: string | null
          ordered_at?: string
          org_id: string
          seller_id: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          discount?: number
          id?: string
          notes?: string | null
          ordered_at?: string
          org_id?: string
          seller_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          created_at: string
          id: string
          org_id: string
          period: string
          seller_id: string
          target_brl: number
          target_kg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          period: string
          seller_id: string
          target_brl?: number
          target_kg?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          period?: string
          seller_id?: string
          target_brl?: number
          target_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invitation_statuses: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invited_by: string | null
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: never
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: never
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { _token: string }
        Returns: {
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      current_org_id: { Args: never; Returns: string }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      list_deleted_records: {
        Args: never
        Returns: {
          deleted_at: string
          deleted_by: string
          deleted_by_name: string
          id: string
          label: string
          table_name: string
        }[]
      }
      list_inventory_catalog: {
        Args: never
        Returns: {
          category: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          sale_price: number
          sku: string
          stock_qty: number
          unit: string
        }[]
      }
      list_org_members_directory: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      restore_record: {
        Args: { _id: string; _table: string }
        Returns: undefined
      }
      soft_delete: { Args: { _id: string; _table: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "op_manager"
        | "sales_manager"
        | "seller"
        | "finance_manager"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "op_manager",
        "sales_manager",
        "seller",
        "finance_manager",
      ],
    },
  },
} as const
