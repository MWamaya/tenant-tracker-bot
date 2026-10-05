import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicPlan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  highlighted: boolean;
}

// The three commercial tiers shown on the public site, in display order.
// "Free Trial" and any other plan a super admin might add for internal use
// stay out of this list unless added here deliberately.
const PUBLIC_PLAN_ORDER = ['Starter', 'Pro', 'Premium'];

/**
 * The public-facing subscription plans (Landing, GetStarted, ChoosePlan),
 * read live from subscription_plans instead of being hardcoded three times
 * over — keeps pricing/features in sync with what a super admin actually
 * assigns from in the admin tool.
 */
export const usePublicPlans = () => {
  return useQuery({
    queryKey: ['public-subscription-plans'],
    queryFn: async (): Promise<PublicPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price, description, features')
        .eq('is_active', true)
        .in('name', PUBLIC_PLAN_ORDER);

      if (error) throw error;

      return (data || [])
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
          highlighted: p.name === 'Pro',
        }))
        .sort((a, b) => PUBLIC_PLAN_ORDER.indexOf(a.name) - PUBLIC_PLAN_ORDER.indexOf(b.name));
    },
  });
};
