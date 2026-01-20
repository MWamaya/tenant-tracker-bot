-- =====================================================
-- KODIPAP ENHANCED BACKEND SCHEMA
-- M-Pesa integration, bank reconciliation, leases, properties
-- =====================================================

-- 1. PROPERTIES TABLE (parent of houses/units)
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  county TEXT,
  town TEXT,
  property_type TEXT DEFAULT 'residential', -- residential, commercial, mixed
  total_units INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add property_id to houses (units)
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- 3. LEASES TABLE (tenant-unit rental agreements)
CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  monthly_rent NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid NUMERIC DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, terminated
  payment_due_day INTEGER DEFAULT 5, -- day of month rent is due
  late_fee_amount NUMERIC DEFAULT 0,
  late_fee_grace_days INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RENT SCHEDULES (expected payments per period)
CREATE TABLE IF NOT EXISTS public.rent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status TEXT DEFAULT 'pending', -- pending, partial, paid, overdue
  late_fee_applied NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PAYMENT SOURCES (M-Pesa, Bank, etc.)
CREATE TABLE IF NOT EXISTS public.payment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- mpesa_paybill, mpesa_till, bank_account
  source_name TEXT NOT NULL, -- e.g., "NCBA Account", "Safaricom Paybill"
  account_number TEXT,
  paybill_number TEXT,
  till_number TEXT,
  bank_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. MPESA TRANSACTIONS (raw incoming from Daraja API)
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- c2b, stk_push, b2c
  transaction_id TEXT UNIQUE NOT NULL, -- M-Pesa TransID
  trans_time TIMESTAMPTZ NOT NULL,
  trans_amount NUMERIC NOT NULL,
  business_short_code TEXT,
  bill_ref_number TEXT, -- Account number customer entered
  invoice_number TEXT,
  org_account_balance NUMERIC,
  third_party_trans_id TEXT,
  msisdn TEXT, -- Phone number
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  -- Matching status
  matched_payment_id UUID REFERENCES public.payments(id),
  matched_tenant_id UUID REFERENCES public.tenants(id),
  matched_house_id UUID REFERENCES public.houses(id),
  match_status TEXT DEFAULT 'unmatched', -- unmatched, auto_matched, manual_matched, failed
  match_confidence NUMERIC, -- 0-100 confidence score
  match_notes TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. BANK TRANSACTIONS (imported from statements)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_source_id UUID REFERENCES public.payment_sources(id),
  transaction_date TIMESTAMPTZ NOT NULL,
  value_date DATE,
  reference TEXT,
  description TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  running_balance NUMERIC,
  -- Matching
  matched_payment_id UUID REFERENCES public.payments(id),
  matched_tenant_id UUID REFERENCES public.tenants(id),
  matched_house_id UUID REFERENCES public.houses(id),
  match_status TEXT DEFAULT 'unmatched',
  match_notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC NOT NULL,
  late_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, partial, overdue, cancelled
  notes TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. WEBHOOKS LOG (for tracking incoming webhooks)
CREATE TABLE IF NOT EXISTS public.webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES public.profiles(id),
  webhook_type TEXT NOT NULL, -- mpesa_c2b, mpesa_stk, bank_callback
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  headers JSONB,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Add payment_source to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'manual', -- manual, mpesa, bank
ADD COLUMN IF NOT EXISTS mpesa_transaction_id UUID REFERENCES public.mpesa_transactions(id),
ADD COLUMN IF NOT EXISTS bank_transaction_id UUID REFERENCES public.bank_transactions(id),
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id),
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Properties RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own properties"
ON public.properties FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own properties"
ON public.properties FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own properties"
ON public.properties FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own properties"
ON public.properties FOR DELETE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all properties"
ON public.properties FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- Leases RLS
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own leases"
ON public.leases FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own leases"
ON public.leases FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own leases"
ON public.leases FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own leases"
ON public.leases FOR DELETE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all leases"
ON public.leases FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- Rent Schedules RLS
ALTER TABLE public.rent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own rent schedules"
ON public.rent_schedules FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own rent schedules"
ON public.rent_schedules FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own rent schedules"
ON public.rent_schedules FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all rent schedules"
ON public.rent_schedules FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- Payment Sources RLS
ALTER TABLE public.payment_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own payment sources"
ON public.payment_sources FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own payment sources"
ON public.payment_sources FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own payment sources"
ON public.payment_sources FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own payment sources"
ON public.payment_sources FOR DELETE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all payment sources"
ON public.payment_sources FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- M-Pesa Transactions RLS
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own mpesa transactions"
ON public.mpesa_transactions FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own mpesa transactions"
ON public.mpesa_transactions FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all mpesa transactions"
ON public.mpesa_transactions FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE POLICY "Service role can insert mpesa transactions"
ON public.mpesa_transactions FOR INSERT
WITH CHECK (true);

-- Bank Transactions RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own bank transactions"
ON public.bank_transactions FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own bank transactions"
ON public.bank_transactions FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own bank transactions"
ON public.bank_transactions FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all bank transactions"
ON public.bank_transactions FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- Invoices RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own invoices"
ON public.invoices FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all invoices"
ON public.invoices FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- Webhooks Log RLS
ALTER TABLE public.webhooks_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can view all webhook logs"
ON public.webhooks_log FOR SELECT
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE POLICY "Service role can insert webhook logs"
ON public.webhooks_log FOR INSERT
WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
BEFORE UPDATE ON public.leases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rent_schedules_updated_at
BEFORE UPDATE ON public.rent_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_sources_updated_at
BEFORE UPDATE ON public.payment_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mpesa_transactions_updated_at
BEFORE UPDATE ON public.mpesa_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at
BEFORE UPDATE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord_id ON public.leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_house_id ON public.leases(house_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_landlord_id ON public.rent_schedules(landlord_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_lease_id ON public.rent_schedules(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_due_date ON public.rent_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_sources_landlord_id ON public.payment_sources(landlord_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_landlord_id ON public.mpesa_transactions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_transaction_id ON public.mpesa_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_msisdn ON public.mpesa_transactions(msisdn);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_bill_ref ON public.mpesa_transactions(bill_ref_number);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_landlord_id ON public.bank_transactions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reference ON public.bank_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_invoices_landlord_id ON public.invoices(landlord_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_webhook_type ON public.webhooks_log(webhook_type);
CREATE INDEX IF NOT EXISTS idx_houses_property_id ON public.houses(property_id);