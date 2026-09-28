-- Tenancy history, independent of the tenants table (which loses a row
-- entirely when a tenant is marked as moved out) and of houses.occupancy_date
-- (which only ever holds the CURRENT tenancy's start, overwritten on every
-- move-in). Without this, a historical report (e.g. last month's rent
-- report) silently drops any house whose tenant has since moved out or been
-- replaced, because it can no longer tell the house was occupied back then.
--
-- One row per tenancy: start_date to end_date (end_date NULL = still
-- ongoing). tenant_name/tenant_phone are snapshotted here so a report can
-- still show who owed the rent even after the tenants row is deleted.
CREATE TABLE public.tenancy_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_tenancy_periods_house_dates ON public.tenancy_periods (house_id, start_date, end_date);
CREATE INDEX idx_tenancy_periods_landlord ON public.tenancy_periods (landlord_id);

ALTER TABLE public.tenancy_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own tenancy periods"
  ON public.tenancy_periods FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can add their own tenancy periods"
  ON public.tenancy_periods FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own tenancy periods"
  ON public.tenancy_periods FOR UPDATE
  USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own tenancy periods"
  ON public.tenancy_periods FOR DELETE
  USING (auth.uid() = landlord_id);

-- Backfill an open tenancy period for every currently-occupied house, using
-- its existing occupancy_date and assigned tenant. This only recovers the
-- CURRENT tenancy — any earlier tenant turnover on the same house before
-- this migration ran was never recorded anywhere and can't be recovered.
INSERT INTO public.tenancy_periods (landlord_id, house_id, tenant_id, tenant_name, tenant_phone, start_date)
SELECT h.landlord_id, h.id, t.id, t.name, t.phone, h.occupancy_date
FROM public.houses h
JOIN public.tenants t ON t.house_id = h.id
WHERE h.status = 'occupied' AND h.occupancy_date IS NOT NULL;
