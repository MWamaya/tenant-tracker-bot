-- =============================================
-- SUPER ADMIN LAYER - DATABASE SCHEMA EXTENSIONS
-- =============================================

-- 1. Extend profiles table with landlord management fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'expired', 'pending')),
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sms_token_balance integer NOT NULL DEFAULT 0;

-- 2. Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  max_properties integer,
  max_tenants integer,
  sms_tokens_included integer NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create landlord_subscriptions table
CREATE TABLE public.landlord_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'grace_period')),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  grace_period_days integer NOT NULL DEFAULT 7,
  auto_renew boolean NOT NULL DEFAULT false,
  payment_reference text,
  amount_paid numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Create sms_transactions table for token tracking
CREATE TABLE public.sms_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'adjustment')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  reference_id uuid,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Create audit_logs table for Super Admin actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Create system_settings table
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  is_sensitive boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7. Create platform_revenue table for tracking subscription payments
CREATE TABLE public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.landlord_subscriptions(id),
  amount numeric NOT NULL,
  payment_method text,
  payment_reference text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL NEW TABLES
-- =============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR SUBSCRIPTION PLANS
-- =============================================

-- Everyone can view active plans
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Only Super Admins can manage plans
CREATE POLICY "Super Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES FOR LANDLORD SUBSCRIPTIONS
-- =============================================

-- Landlords can view their own subscriptions
CREATE POLICY "Landlords can view their own subscriptions"
ON public.landlord_subscriptions
FOR SELECT
USING (auth.uid() = landlord_id);

-- Super Admins can manage all subscriptions
CREATE POLICY "Super Admins can manage all subscriptions"
ON public.landlord_subscriptions
FOR ALL
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES FOR SMS TRANSACTIONS
-- =============================================

-- Landlords can view their own SMS transactions
CREATE POLICY "Landlords can view their own SMS transactions"
ON public.sms_transactions
FOR SELECT
USING (auth.uid() = landlord_id);

-- Super Admins can manage all SMS transactions
CREATE POLICY "Super Admins can manage all SMS transactions"
ON public.sms_transactions
FOR ALL
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES FOR AUDIT LOGS
-- =============================================

-- Only Super Admins can view audit logs
CREATE POLICY "Super Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Only Super Admins can insert audit logs
CREATE POLICY "Super Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES FOR SYSTEM SETTINGS
-- =============================================

-- Only Super Admins can manage system settings
CREATE POLICY "Super Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES FOR PLATFORM REVENUE
-- =============================================

-- Only Super Admins can view platform revenue
CREATE POLICY "Super Admins can view platform revenue"
ON public.platform_revenue
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Only Super Admins can manage platform revenue
CREATE POLICY "Super Admins can manage platform revenue"
ON public.platform_revenue
FOR ALL
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- UPDATE PROFILES RLS FOR SUPER ADMIN ACCESS
-- =============================================

-- Super Admins can view all profiles
CREATE POLICY "Super Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super Admins can update all profiles
CREATE POLICY "Super Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- SUPER ADMIN ACCESS TO LANDLORD DATA (READ-ONLY)
-- =============================================

-- Super Admins can view all houses
CREATE POLICY "Super Admins can view all houses"
ON public.houses
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super Admins can view all tenants
CREATE POLICY "Super Admins can view all tenants"
ON public.tenants
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super Admins can view all payments
CREATE POLICY "Super Admins can view all payments"
ON public.payments
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super Admins can view all balances
CREATE POLICY "Super Admins can view all balances"
ON public.balances
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super Admins can view all email logs
CREATE POLICY "Super Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super Admins can update email logs (for reprocessing)
CREATE POLICY "Super Admins can update email logs"
ON public.email_logs
FOR UPDATE
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landlord_subscriptions_updated_at
BEFORE UPDATE ON public.landlord_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- =============================================

INSERT INTO public.subscription_plans (name, description, price, duration_days, max_properties, max_tenants, sms_tokens_included, features) VALUES
('Free Trial', 'Try Kodipap for 14 days', 0, 14, 5, 10, 50, '["Basic property management", "Tenant tracking", "Payment recording"]'),
('Starter', 'Perfect for small landlords', 500, 30, 10, 20, 100, '["Property management", "Tenant tracking", "Payment recording", "Basic reports"]'),
('Professional', 'For growing portfolios', 1500, 30, 50, 100, 500, '["All Starter features", "Advanced reports", "Email notifications", "Priority support"]'),
('Enterprise', 'Unlimited properties', 5000, 30, NULL, NULL, 2000, '["All Professional features", "Unlimited properties", "Unlimited tenants", "API access", "Dedicated support"]');

-- =============================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- =============================================

INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('subscription_grace_period_days', '7', 'Number of days after subscription expiry before account suspension'),
('default_sms_provider', '"africas_talking"', 'Default SMS provider for the platform'),
('bank_email_parsing_enabled', 'true', 'Enable automatic bank email parsing'),
('maintenance_mode', 'false', 'Put the platform in maintenance mode');