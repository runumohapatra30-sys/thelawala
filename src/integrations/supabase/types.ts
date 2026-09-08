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
      addresses: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string | null
          lat: number
          line: string
          lng: number
          mobile: string
          pincode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          lat: number
          line: string
          lng: number
          mobile: string
          pincode: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          lat?: number
          line?: string
          lng?: number
          mobile?: string
          pincode?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          emoji: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          emoji?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          emoji?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      delivery_partners: {
        Row: {
          created_at: string
          dl_number: string | null
          id: string
          is_busy: boolean
          is_online: boolean
          lat: number | null
          lng: number | null
          mobile: string | null
          name: string
          photo_url: string | null
          status: string
          updated_at: string
          user_id: string | null
          vehicle_no: string | null
        }
        Insert: {
          created_at?: string
          dl_number?: string | null
          id?: string
          is_busy?: boolean
          is_online?: boolean
          lat?: number | null
          lng?: number | null
          mobile?: string | null
          name: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_no?: string | null
        }
        Update: {
          created_at?: string
          dl_number?: string | null
          id?: string
          is_busy?: boolean
          is_online?: boolean
          lat?: number | null
          lng?: number | null
          mobile?: string | null
          name?: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_no?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          details: string | null
          food_type: string
          id: string
          in_stock: boolean
          mrp: number
          name: string
          photo_url: string | null
          price: number
          unit: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          details?: string | null
          food_type?: string
          id?: string
          in_stock?: boolean
          mrp?: number
          name: string
          photo_url?: string | null
          price?: number
          unit?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          details?: string | null
          food_type?: string
          id?: string
          in_stock?: boolean
          mrp?: number
          name?: string
          photo_url?: string | null
          price?: number
          unit?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_id: string | null
          mrp: number
          name: string
          order_id: string
          photo_url: string | null
          price: number
          qty: number
        }
        Insert: {
          id?: string
          item_id?: string | null
          mrp?: number
          name: string
          order_id: string
          photo_url?: string | null
          price: number
          qty?: number
        }
        Update: {
          id?: string
          item_id?: string | null
          mrp?: number
          name?: string
          order_id?: string
          photo_url?: string | null
          price?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address_line: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          code: string
          completed_at: string | null
          created_at: string
          customer_mobile: string
          customer_name: string
          delivered_at: string | null
          delivery_fee: number
          delivery_otp: string
          distance_km: number
          drop_lat: number
          drop_lng: number
          food_total: number
          gateway_reference_id: string | null
          grand_total: number
          handling_fee: number
          id: string
          offer_expires_at: string | null
          offered_to: string | null
          packing_fee: number
          partner_id: string | null
          payment_mode: string
          payment_status: string
          penalty_fee: number
          picked_up_at: string | null
          pickup_otp: string
          pickup_scanned_at: string | null
          pincode: string
          platform_fee: number
          proof_photo_url: string | null
          qr_hash: string | null
          rejected_partner_ids: string[]
          status: string
          surge_fee: number
          tip_amount: number
          updated_at: string
          user_id: string
          vendor_id: string
          wallet_paid: number
        }
        Insert: {
          accepted_at?: string | null
          address_line: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          customer_mobile: string
          customer_name: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_otp?: string
          distance_km?: number
          drop_lat: number
          drop_lng: number
          food_total?: number
          gateway_reference_id?: string | null
          grand_total?: number
          handling_fee?: number
          id?: string
          offer_expires_at?: string | null
          offered_to?: string | null
          packing_fee?: number
          partner_id?: string | null
          payment_mode?: string
          payment_status?: string
          penalty_fee?: number
          picked_up_at?: string | null
          pickup_otp?: string
          pickup_scanned_at?: string | null
          pincode: string
          platform_fee?: number
          proof_photo_url?: string | null
          qr_hash?: string | null
          rejected_partner_ids?: string[]
          status?: string
          surge_fee?: number
          tip_amount?: number
          updated_at?: string
          user_id: string
          vendor_id: string
          wallet_paid?: number
        }
        Update: {
          accepted_at?: string | null
          address_line?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          customer_mobile?: string
          customer_name?: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_otp?: string
          distance_km?: number
          drop_lat?: number
          drop_lng?: number
          food_total?: number
          gateway_reference_id?: string | null
          grand_total?: number
          handling_fee?: number
          id?: string
          offer_expires_at?: string | null
          offered_to?: string | null
          packing_fee?: number
          partner_id?: string | null
          payment_mode?: string
          payment_status?: string
          penalty_fee?: number
          picked_up_at?: string | null
          pickup_otp?: string
          pickup_scanned_at?: string | null
          pincode?: string
          platform_fee?: number
          proof_photo_url?: string | null
          qr_hash?: string | null
          rejected_partner_ids?: string[]
          status?: string
          surge_fee?: number
          tip_amount?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
          wallet_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_offered_to_fkey"
            columns: ["offered_to"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credentials: {
        Row: {
          id: boolean
          is_live: boolean
          payu_key: string | null
          payu_salt: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          is_live?: boolean
          payu_key?: string | null
          payu_salt?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          is_live?: boolean
          payu_key?: string | null
          payu_salt?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_ledgers: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          partner_id: string | null
          party_type: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          partner_id?: string | null
          party_type: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          partner_id?: string | null
          party_type?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_ledgers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_ledgers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_ledgers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          mobile: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          mobile?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_account_no: string | null
          bank_holder: string | null
          bank_ifsc: string | null
          created_at: string
          id: string
          method: string
          order_id: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          bank_account_no?: string | null
          bank_holder?: string | null
          bank_ifsc?: string | null
          created_at?: string
          id?: string
          method?: string
          order_id: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_account_no?: string | null
          bank_holder?: string | null
          bank_ifsc?: string | null
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          order_id: string | null
          resolution_note: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          order_id?: string | null
          resolution_note?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          order_id?: string | null
          resolution_note?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          base_delivery_distance_km: number
          base_delivery_fee: number
          cancel_penalty_fee: number
          cashfree_app_id: string | null
          enable_cod: boolean
          enable_google_login: boolean
          enable_handling_fee: boolean
          enable_online_payment: boolean
          enable_packing_fee: boolean
          enable_platform_fee: boolean
          enable_surge_fee: boolean
          extra_fee_per_km: number
          free_delivery_threshold: number | null
          handling_fee: number
          id: boolean
          packing_fee: number
          payment_gateway: string
          payu_app_id: string | null
          payu_key: string | null
          platform_fee: number
          support_number: string
          surge_fee: number
          updated_at: string
          vendor_commission_pct: number
          wallet_max_topup: number
          wallet_min_topup: number
        }
        Insert: {
          base_delivery_distance_km?: number
          base_delivery_fee?: number
          cancel_penalty_fee?: number
          cashfree_app_id?: string | null
          enable_cod?: boolean
          enable_google_login?: boolean
          enable_handling_fee?: boolean
          enable_online_payment?: boolean
          enable_packing_fee?: boolean
          enable_platform_fee?: boolean
          enable_surge_fee?: boolean
          extra_fee_per_km?: number
          free_delivery_threshold?: number | null
          handling_fee?: number
          id?: boolean
          packing_fee?: number
          payment_gateway?: string
          payu_app_id?: string | null
          payu_key?: string | null
          platform_fee?: number
          support_number?: string
          surge_fee?: number
          updated_at?: string
          vendor_commission_pct?: number
          wallet_max_topup?: number
          wallet_min_topup?: number
        }
        Update: {
          base_delivery_distance_km?: number
          base_delivery_fee?: number
          cancel_penalty_fee?: number
          cashfree_app_id?: string | null
          enable_cod?: boolean
          enable_google_login?: boolean
          enable_handling_fee?: boolean
          enable_online_payment?: boolean
          enable_packing_fee?: boolean
          enable_platform_fee?: boolean
          enable_surge_fee?: boolean
          extra_fee_per_km?: number
          free_delivery_threshold?: number | null
          handling_fee?: number
          id?: boolean
          packing_fee?: number
          payment_gateway?: string
          payu_app_id?: string | null
          payu_key?: string | null
          platform_fee?: number
          support_number?: string
          surge_fee?: number
          updated_at?: string
          vendor_commission_pct?: number
          wallet_max_topup?: number
          wallet_min_topup?: number
        }
        Relationships: []
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
      vendors: {
        Row: {
          address: string | null
          created_at: string
          fssai_number: string | null
          id: string
          is_open: boolean
          lat: number
          lng: number
          mobile: string | null
          owner_id: string | null
          owner_name: string | null
          photo_url: string | null
          stall_name: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          fssai_number?: string | null
          id?: string
          is_open?: boolean
          lat?: number
          lng?: number
          mobile?: string | null
          owner_id?: string | null
          owner_name?: string | null
          photo_url?: string | null
          stall_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          fssai_number?: string | null
          id?: string
          is_open?: boolean
          lat?: number
          lng?: number
          mobile?: string | null
          owner_id?: string | null
          owner_name?: string | null
          photo_url?: string | null
          stall_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_closure_requests: {
        Row: {
          amount: number
          created_at: string
          gateway_refund_id: string | null
          id: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          gateway_refund_id?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_refund_id?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          gateway_reference_id: string | null
          id: string
          note: string | null
          order_id: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_reference_id?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_reference_id?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_delivery: {
        Args: { _order_id: string; _otp: string }
        Returns: undefined
      }
      decide_refund: {
        Args: { _admin_note?: string; _approve: boolean; _request_id: string }
        Returns: undefined
      }
      decide_wallet_closure: {
        Args: { _approve: boolean; _refund_ref?: string; _request_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_refund: {
        Args: {
          _amount: number
          _bank_account_no?: string
          _bank_holder?: string
          _bank_ifsc?: string
          _method?: string
          _order_id: string
          _reason: string
        }
        Returns: string
      }
      request_wallet_closure: { Args: never; Returns: string }
      wallet_credit: {
        Args: {
          _amount: number
          _note?: string
          _order_id?: string
          _ref?: string
          _source: string
          _user_id: string
        }
        Returns: number
      }
      wallet_debit: {
        Args: { _amount: number; _note?: string; _order_id?: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "rider" | "customer"
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
      app_role: ["admin", "vendor", "rider", "customer"],
    },
  },
} as const
