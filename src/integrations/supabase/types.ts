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
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balances: {
        Row: {
          balance: number
          carry_forward: number
          created_at: string
          expected_rent: number
          house_id: string
          id: string
          landlord_id: string
          month: string
          paid_amount: number
          updated_at: string
        }
        Insert: {
          balance?: number
          carry_forward?: number
          created_at?: string
          expected_rent: number
          house_id: string
          id?: string
          landlord_id: string
          month: string
          paid_amount?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          carry_forward?: number
          created_at?: string
          expected_rent?: number
          house_id?: string
          id?: string
          landlord_id?: string
          month?: string
          paid_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balances_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          landlord_id: string
          match_notes: string | null
          match_status: string | null
          matched_house_id: string | null
          matched_payment_id: string | null
          matched_tenant_id: string | null
          payment_source_id: string | null
          raw_data: Json | null
          reference: string | null
          running_balance: number | null
          transaction_date: string
          updated_at: string
          value_date: string | null
        }
        Insert: {
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          landlord_id: string
          match_notes?: string | null
          match_status?: string | null
          matched_house_id?: string | null
          matched_payment_id?: string | null
          matched_tenant_id?: string | null
          payment_source_id?: string | null
          raw_data?: Json | null
          reference?: string | null
          running_balance?: number | null
          transaction_date: string
          updated_at?: string
          value_date?: string | null
        }
        Update: {
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          landlord_id?: string
          match_notes?: string | null
          match_status?: string | null
          matched_house_id?: string | null
          matched_payment_id?: string | null
          matched_tenant_id?: string | null
          payment_source_id?: string | null
          raw_data?: Json | null
          reference?: string | null
          running_balance?: number | null
          transaction_date?: string
          updated_at?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_house_id_fkey"
            columns: ["matched_house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_tenant_id_fkey"
            columns: ["matched_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_payment_source_id_fkey"
            columns: ["payment_source_id"]
            isOneToOne: false
            referencedRelation: "payment_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          landlord_id: string
          parsed_amount: number | null
          parsed_date: string | null
          parsed_house_no: string | null
          parsed_mpesa_ref: string | null
          parsed_tenant_name: string | null
          payment_id: string | null
          raw_message: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          landlord_id: string
          parsed_amount?: number | null
          parsed_date?: string | null
          parsed_house_no?: string | null
          parsed_mpesa_ref?: string | null
          parsed_tenant_name?: string | null
          payment_id?: string | null
          raw_message: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          landlord_id?: string
          parsed_amount?: number | null
          parsed_date?: string | null
          parsed_house_no?: string | null
          parsed_mpesa_ref?: string | null
          parsed_tenant_name?: string | null
          payment_id?: string | null
          raw_message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          created_at: string
          expected_rent: number
          house_no: string
          id: string
          landlord_id: string
          occupancy_date: string | null
          property_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_rent?: number
          house_no: string
          id?: string
          landlord_id: string
          occupancy_date?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_rent?: number
          house_no?: string
          id?: string
          landlord_id?: string
          occupancy_date?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "houses_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "houses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          balance: number | null
          created_at: string
          due_date: string
          house_id: string
          id: string
          invoice_date: string
          invoice_number: string
          landlord_id: string
          late_fee: number | null
          lease_id: string | null
          notes: string | null
          paid_at: string | null
          sent_at: string | null
          status: string | null
          subtotal: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          due_date: string
          house_id: string
          id?: string
          invoice_date?: string
          invoice_number: string
          landlord_id: string
          late_fee?: number | null
          lease_id?: string | null
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal: number
          tenant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          due_date?: string
          house_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          landlord_id?: string
          late_fee?: number | null
          lease_id?: string | null
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_subscriptions: {
        Row: {
          amount_paid: number | null
          auto_renew: boolean
          created_at: string
          end_date: string
          grace_period_days: number
          id: string
          landlord_id: string
          payment_reference: string | null
          plan_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          auto_renew?: boolean
          created_at?: string
          end_date: string
          grace_period_days?: number
          id?: string
          landlord_id: string
          payment_reference?: string | null
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          auto_renew?: boolean
          created_at?: string
          end_date?: string
          grace_period_days?: number
          id?: string
          landlord_id?: string
          payment_reference?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_subscriptions_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landlord_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          created_at: string
          deposit_amount: number | null
          deposit_paid: number | null
          end_date: string | null
          house_id: string
          id: string
          landlord_id: string
          late_fee_amount: number | null
          late_fee_grace_days: number | null
          monthly_rent: number
          notes: string | null
          payment_due_day: number | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: number | null
          end_date?: string | null
          house_id: string
          id?: string
          landlord_id: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          monthly_rent: number
          notes?: string | null
          payment_due_day?: number | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: number | null
          end_date?: string | null
          house_id?: string
          id?: string
          landlord_id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          monthly_rent?: number
          notes?: string | null
          payment_due_day?: number | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_transactions: {
        Row: {
          bill_ref_number: string | null
          business_short_code: string | null
          created_at: string
          first_name: string | null
          id: string
          invoice_number: string | null
          landlord_id: string
          last_name: string | null
          match_confidence: number | null
          match_notes: string | null
          match_status: string | null
          matched_house_id: string | null
          matched_payment_id: string | null
          matched_tenant_id: string | null
          middle_name: string | null
          msisdn: string | null
          org_account_balance: number | null
          raw_payload: Json | null
          third_party_trans_id: string | null
          trans_amount: number
          trans_time: string
          transaction_id: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          bill_ref_number?: string | null
          business_short_code?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          invoice_number?: string | null
          landlord_id: string
          last_name?: string | null
          match_confidence?: number | null
          match_notes?: string | null
          match_status?: string | null
          matched_house_id?: string | null
          matched_payment_id?: string | null
          matched_tenant_id?: string | null
          middle_name?: string | null
          msisdn?: string | null
          org_account_balance?: number | null
          raw_payload?: Json | null
          third_party_trans_id?: string | null
          trans_amount: number
          trans_time: string
          transaction_id: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          bill_ref_number?: string | null
          business_short_code?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          invoice_number?: string | null
          landlord_id?: string
          last_name?: string | null
          match_confidence?: number | null
          match_notes?: string | null
          match_status?: string | null
          matched_house_id?: string | null
          matched_payment_id?: string | null
          matched_tenant_id?: string | null
          middle_name?: string | null
          msisdn?: string | null
          org_account_balance?: number | null
          raw_payload?: Json | null
          third_party_trans_id?: string | null
          trans_amount?: number
          trans_time?: string
          transaction_id?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_matched_house_id_fkey"
            columns: ["matched_house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_matched_tenant_id_fkey"
            columns: ["matched_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sources: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          landlord_id: string
          paybill_number: string | null
          source_name: string
          source_type: string
          till_number: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          landlord_id: string
          paybill_number?: string | null
          source_name: string
          source_type: string
          till_number?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          landlord_id?: string
          paybill_number?: string | null
          source_name?: string
          source_type?: string
          till_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_sources_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_transaction_id: string | null
          created_at: string
          house_id: string | null
          id: string
          invoice_id: string | null
          landlord_id: string
          lease_id: string | null
          mpesa_ref: string
          mpesa_transaction_id: string | null
          payment_date: string
          payment_source: string | null
          sender_name: string | null
          sender_phone: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          bank_transaction_id?: string | null
          created_at?: string
          house_id?: string | null
          id?: string
          invoice_id?: string | null
          landlord_id: string
          lease_id?: string | null
          mpesa_ref: string
          mpesa_transaction_id?: string | null
          payment_date: string
          payment_source?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          bank_transaction_id?: string | null
          created_at?: string
          house_id?: string | null
          id?: string
          invoice_id?: string | null
          landlord_id?: string
          lease_id?: string | null
          mpesa_ref?: string
          mpesa_transaction_id?: string | null
          payment_date?: string
          payment_source?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_mpesa_transaction_id_fkey"
            columns: ["mpesa_transaction_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue: {
        Row: {
          amount: number
          created_at: string
          id: string
          landlord_id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          landlord_id: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          landlord_id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_revenue_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          sms_token_balance: number
          updated_at: string
        }
        Insert: {
          account_status?: string
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_login_at?: string | null
          phone?: string | null
          sms_token_balance?: number
          updated_at?: string
        }
        Update: {
          account_status?: string
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          sms_token_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          county: string | null
          created_at: string
          id: string
          landlord_id: string
          name: string
          property_type: string | null
          total_units: number | null
          town: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          county?: string | null
          created_at?: string
          id?: string
          landlord_id: string
          name: string
          property_type?: string | null
          total_units?: number | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          county?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          name?: string
          property_type?: string | null
          total_units?: number | null
          town?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_schedules: {
        Row: {
          amount_due: number
          amount_paid: number | null
          balance: number | null
          created_at: string
          due_date: string
          house_id: string
          id: string
          landlord_id: string
          late_fee_applied: number | null
          lease_id: string
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          due_date: string
          house_id: string
          id?: string
          landlord_id: string
          late_fee_applied?: number | null
          lease_id: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          due_date?: string
          house_id?: string
          id?: string
          landlord_id?: string
          late_fee_applied?: number | null
          lease_id?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_schedules_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_schedules_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_schedules_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          landlord_id: string
          reference_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          landlord_id: string
          reference_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          landlord_id?: string
          reference_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_transactions_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean
          max_properties: number | null
          max_tenants: number | null
          name: string
          price: number
          sms_tokens_included: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          max_properties?: number | null
          max_tenants?: number | null
          name: string
          price?: number
          sms_tokens_included?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          max_properties?: number | null
          max_tenants?: number | null
          name?: string
          price?: number
          sms_tokens_included?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          house_id: string | null
          id: string
          landlord_id: string
          move_in_date: string | null
          name: string
          phone: string
          secondary_phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          house_id?: string | null
          id?: string
          landlord_id: string
          move_in_date?: string | null
          name: string
          phone: string
          secondary_phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          house_id?: string | null
          id?: string
          landlord_id?: string
          move_in_date?: string | null
          name?: string
          phone?: string
          secondary_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      webhooks_log: {
        Row: {
          created_at: string
          endpoint: string
          error_message: string | null
          headers: Json | null
          id: string
          landlord_id: string | null
          method: string | null
          payload: Json
          processed: boolean | null
          response_body: Json | null
          response_status: number | null
          webhook_type: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          landlord_id?: string | null
          method?: string | null
          payload: Json
          processed?: boolean | null
          response_body?: Json | null
          response_status?: number | null
          webhook_type: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          landlord_id?: string | null
          method?: string | null
          payload?: Json
          processed?: boolean | null
          response_body?: Json | null
          response_status?: number | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_log_landlord_id_fkey"
            columns: ["landlord_id"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "SUPER_ADMIN" | "LANDLORD_ADMIN"
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
      app_role: ["SUPER_ADMIN", "LANDLORD_ADMIN"],
    },
  },
} as const
