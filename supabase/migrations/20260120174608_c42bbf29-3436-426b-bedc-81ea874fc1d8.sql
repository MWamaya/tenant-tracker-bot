-- Fix service role insert policies to use service_role check instead of true
-- These policies are for webhook endpoints that use service_role key

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role can insert mpesa transactions" ON public.mpesa_transactions;
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON public.webhooks_log;

-- Recreate with proper service role check using current_setting
-- Note: Edge functions using service_role key bypass RLS entirely, 
-- so we can make these restrictive for regular users

-- For mpesa_transactions: Only Super Admins can insert (webhooks bypass RLS)
CREATE POLICY "Super Admins can insert mpesa transactions"
ON public.mpesa_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'));

-- For webhooks_log: Only Super Admins can insert (webhooks bypass RLS)
CREATE POLICY "Super Admins can insert webhook logs"
ON public.webhooks_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'));