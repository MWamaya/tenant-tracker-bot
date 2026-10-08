export interface PublicPlan {
  name: string;
  price: number;
  /** price / maxTenants — shown as the per-tenant rate selling point. */
  pricePerTenant: number;
  description: string;
  maxProperties: number | null; // null = unlimited
  maxTenants: number | null; // null = unlimited
  smsTokensIncluded: number;
  features: string[];
  highlighted: boolean;
}

// Static — matches the public pricing advertised on the Landing page, and
// the subscription_plans rows the super admin manages. Previously fetched
// live via usePublicPlans, which was slow and added a loading state for
// pricing that never changes.
//
// Priced per tenant, with the rate dropping as the tier grows — mirrors how
// comparable Kenyan rent-collection tools price (KES ~60-180/unit/month),
// while still undercutting them meaningfully at every tier. Portfolios over
// 100 tenants are handled on the ENTERPRISE_PLAN below, not here.
export const PUBLIC_PLANS: PublicPlan[] = [
  {
    name: 'Starter',
    price: 1250,
    pricePerTenant: 50,
    description: 'Get every tenant off M-Pesa screenshots and onto autopilot',
    maxProperties: 1,
    maxTenants: 25,
    smsTokensIncluded: 50,
    features: [
      'Automatic M-Pesa payment matching',
      'Tenant statements, generated instantly',
      'Rent due & overdue reminders',
      'Live collections dashboard',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 2925,
    pricePerTenant: 45,
    description: 'Run a growing portfolio without hiring an accountant',
    maxProperties: 5,
    maxTenants: 65,
    smsTokensIncluded: 150,
    features: [
      'Everything in Starter',
      'Bank payment matching, not just M-Pesa',
      'Advanced reports & reconciliation',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Premium',
    price: 4000,
    pricePerTenant: 40,
    description: 'Multi-property landlords who need full visibility',
    maxProperties: 10,
    maxTenants: 100,
    smsTokensIncluded: 250,
    features: [
      'Everything in Pro',
      'API access',
      'Dedicated support',
      'Custom monthly reports',
    ],
    highlighted: false,
  },
];

// Not a self-serve M-Pesa plan — shown as a fourth card on the public
// pricing section only, routed to a quote request instead of checkout.
export const ENTERPRISE_PLAN = {
  name: 'Enterprise',
  description: 'Portfolios over 100 tenants, or multiple property managers',
  features: ['Everything in Premium', 'Custom tenant & property limits', 'Dedicated account manager', 'Custom contract & invoicing'],
};

/** Paying for all 12 months at once gets this fraction off the total — the
 * only discount in the pricing model. Must match the same constant in
 * supabase/functions/mpesa-subscription-stk-push/index.ts (the edge
 * function can't import this file, so it's duplicated — change both). */
export const ANNUAL_DISCOUNT = 0.2;

/** Total charge for prepaying `months` cycles of a plan. Only months === 12
 * gets the annual discount — 1/3/6-month prepay stays a straight multiply. */
export function calcPrepayTotal(monthlyPrice: number, months: number): number {
  if (months === 12) {
    return Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT));
  }
  return monthlyPrice * months;
}
