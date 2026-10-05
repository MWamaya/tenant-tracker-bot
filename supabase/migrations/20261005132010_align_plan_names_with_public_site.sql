-- The public marketing site (Landing, GetStarted, ChoosePlan) has always
-- advertised Starter/Pro/Premium at KES 500/1,500/3,500 — but the real
-- subscription_plans rows this admin tool assigns from were seeded as
-- Starter/Professional/Enterprise, with Enterprise at KES 5,000. Aligning
-- the DB to match what's publicly advertised (confirmed as the intended
-- pricing), not the other way around.
update public.subscription_plans set name = 'Pro' where name = 'Professional';
update public.subscription_plans set name = 'Premium', price = 3500 where name = 'Enterprise';
