-- Premium's feature list still said "All Professional features", left over
-- from before the Professional -> Pro rename in
-- 20261005132010_align_plan_names_with_public_site.sql. Fix the stale
-- wording so it matches the plan it actually refers to.
update public.subscription_plans
set features = (
  select jsonb_agg(
    case when value = '"All Professional features"'::jsonb then '"All Pro features"'::jsonb else value end
  )
  from jsonb_array_elements(features) as value
)
where name = 'Premium'
  and features @> '["All Professional features"]'::jsonb;
