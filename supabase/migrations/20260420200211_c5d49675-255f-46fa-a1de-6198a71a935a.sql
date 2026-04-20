-- Allow Super Admins to fully manage landlord-owned data (for impersonation/view-as mode)
-- Every write while impersonating is logged via the audit_logs table from the client side.

-- HOUSES
CREATE POLICY "Super Admins can insert houses"
ON public.houses FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can update houses"
ON public.houses FOR UPDATE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can delete houses"
ON public.houses FOR DELETE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- TENANTS
CREATE POLICY "Super Admins can insert tenants"
ON public.tenants FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can update tenants"
ON public.tenants FOR UPDATE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can delete tenants"
ON public.tenants FOR DELETE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- PROPERTIES
CREATE POLICY "Super Admins can insert properties"
ON public.properties FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can update properties"
ON public.properties FOR UPDATE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can delete properties"
ON public.properties FOR DELETE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- PAYMENTS
CREATE POLICY "Super Admins can insert payments"
ON public.payments FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- LEASES
CREATE POLICY "Super Admins can insert leases"
ON public.leases FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can update leases"
ON public.leases FOR UPDATE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can delete leases"
ON public.leases FOR DELETE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- BALANCES
CREATE POLICY "Super Admins can insert balances"
ON public.balances FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can update balances"
ON public.balances FOR UPDATE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- PAYMENT SOURCES
CREATE POLICY "Super Admins can insert payment sources"
ON public.payment_sources FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can update payment sources"
ON public.payment_sources FOR UPDATE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Super Admins can delete payment sources"
ON public.payment_sources FOR DELETE TO public
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));