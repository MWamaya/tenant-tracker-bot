export interface PublicPlan {
  name: string;
  price: number;
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
export const PUBLIC_PLANS: PublicPlan[] = [
  {
    name: 'Starter',
    price: 500,
    description: 'Perfect for small landlords',
    maxProperties: 10,
    maxTenants: 20,
    smsTokensIncluded: 100,
    features: ['Property management', 'Tenant tracking', 'Payment recording', 'Basic reports'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 1500,
    description: 'For growing portfolios',
    maxProperties: 50,
    maxTenants: 100,
    smsTokensIncluded: 500,
    features: ['All Starter features', 'Advanced reports', 'Email notifications', 'Priority support'],
    highlighted: true,
  },
  {
    name: 'Premium',
    price: 3500,
    description: 'Unlimited properties',
    maxProperties: null,
    maxTenants: null,
    smsTokensIncluded: 2000,
    features: [
      'All Pro features',
      'Unlimited properties',
      'Unlimited tenants',
      'API access',
      'Dedicated support',
    ],
    highlighted: false,
  },
];
