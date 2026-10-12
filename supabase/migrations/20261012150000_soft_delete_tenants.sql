-- "Mark as Moved Out" used to hard-delete the tenants row. payments.tenant_id
-- is ON DELETE SET NULL, so every payment that tenant ever made lost its
-- tenant link the moment they moved out — which is exactly what made those
-- payments show up in Needs Review again, even though they were already
-- correctly matched. Soft-delete instead: the row (and every payment's link
-- to it) stays forever; moved_out_at just marks them inactive so they drop
-- out of active lists, counts, and future payment matching.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS moved_out_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.moved_out_at IS
  'NULL = active tenant. Set when a tenant moves out instead of deleting the row, so historical payments keep their tenant_id link.';
