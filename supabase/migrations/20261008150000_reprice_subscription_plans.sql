-- Repriced per tenant (rate drops as the tier grows), replacing flat
-- Starter/Pro/Premium pricing that significantly undercut comparable
-- Kenyan rent-collection pricing (~KES 60-180/unit/month elsewhere).
-- Must stay in sync with PUBLIC_PLANS in src/lib/plans.ts — that array
-- is what the pricing page displays, this table is what
-- mpesa-subscription-stk-push actually charges.
update public.subscription_plans set
  price = 1250,
  max_properties = 1,
  max_tenants = 25,
  sms_tokens_included = 50
where name = 'Starter';

update public.subscription_plans set
  price = 2925,
  max_properties = 5,
  max_tenants = 65,
  sms_tokens_included = 150
where name = 'Pro';

update public.subscription_plans set
  price = 4000,
  max_properties = 10,
  max_tenants = 100,
  sms_tokens_included = 250
where name = 'Premium';
