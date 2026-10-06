export interface PublicPlan {
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted: boolean;
}

// Static — matches the public pricing advertised on the Landing page.
// Previously fetched from subscription_plans via usePublicPlans, which
// was slow and added a loading state for pricing that never changes.
export const PUBLIC_PLANS: PublicPlan[] = [
  {
    name: 'Starter',
    price: 500,
    description: 'Perfect for small landlords',
    features: ['Property management', 'Tenant tracking', 'Payment recording', 'Basic reports'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 1500,
    description: 'For growing portfolios',
    features: ['All Starter features', 'Advanced reports', 'Email notifications', 'Priority support'],
    highlighted: true,
  },
  {
    name: 'Premium',
    price: 3500,
    description: 'Unlimited properties',
    features: ['All Pro features', 'Unlimited properties', 'Unlimited tenants', 'Dedicated support'],
    highlighted: false,
  },
];
