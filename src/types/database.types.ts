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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      compliance_docs: {
        Row: {
          doc_type: Database["public"]["Enums"]["compliance_doc_type"]
          file_url: string | null
          generated_at: string
          id: string
          metadata: Json
          organization_id: string
          pickup_id: string | null
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["compliance_doc_type"]
          file_url?: string | null
          generated_at?: string
          id?: string
          metadata?: Json
          organization_id: string
          pickup_id?: string | null
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["compliance_doc_type"]
          file_url?: string | null
          generated_at?: string
          id?: string
          metadata?: Json
          organization_id?: string
          pickup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_docs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_docs_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paise: number
          created_at: string
          due_date: string | null
          id: string
          organization_id: string
          paid_at: string | null
          pickup_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tax_paise: number
          total_paise: number | null
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          pickup_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tax_paise?: number
          total_paise?: number | null
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          pickup_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tax_paise?: number
          total_paise?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string
          city: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          pincode: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          address: string
          city?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          pincode?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          address?: string
          city?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          pincode?: string | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      pickup_events: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          pickup_id: string
          status: Database["public"]["Enums"]["pickup_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pickup_id: string
          status: Database["public"]["Enums"]["pickup_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pickup_id?: string
          status?: Database["public"]["Enums"]["pickup_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pickup_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_events_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
        ]
      }
      pickups: {
        Row: {
          actual_weight_kg: number | null
          collector_id: string | null
          created_at: string
          estimated_weight_kg: number | null
          farmer_id: string | null
          id: string
          notes: string | null
          organization_id: string
          photo_after_url: string | null
          photo_before_url: string | null
          pickup_number: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          requested_by: string
          scheduled_date: string
          scheduled_slot: string | null
          status: Database["public"]["Enums"]["pickup_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_weight_kg?: number | null
          collector_id?: string | null
          created_at?: string
          estimated_weight_kg?: number | null
          farmer_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          pickup_number?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          requested_by: string
          scheduled_date: string
          scheduled_slot?: string | null
          status?: Database["public"]["Enums"]["pickup_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_weight_kg?: number | null
          collector_id?: string | null
          created_at?: string
          estimated_weight_kg?: number | null
          farmer_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          pickup_number?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          requested_by?: string
          scheduled_date?: string
          scheduled_slot?: string | null
          status?: Database["public"]["Enums"]["pickup_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickups_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          organization_id: string
          plan: string
          price_paise: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          plan?: string
          price_paise?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          plan?: string
          price_paise?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity_kg: number
          created_at: string
          id: string
          is_active: boolean
          owner_id: string
          registration_number: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          capacity_kg?: number
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id: string
          registration_number: string
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          capacity_kg?: number
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
          registration_number?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      compliance_doc_type: "manifest" | "receipt" | "certificate" | "report"
      kyc_status: "pending" | "submitted" | "verified" | "rejected"
      org_type: "apartment" | "rwa" | "techpark"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      pickup_status:
        | "scheduled"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "processed"
        | "cancelled"
      recurrence_type: "one_time" | "weekly" | "biweekly" | "monthly"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "bwg" | "collector" | "farmer" | "admin"
      vehicle_type: "auto" | "mini_truck" | "truck" | "tempo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
