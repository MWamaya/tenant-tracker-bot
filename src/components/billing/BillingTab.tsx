import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId, useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PUBLIC_PLANS, PublicPlan } from '@/lib/plans';
import { MpesaPayDialog } from '@/components/billing/MpesaPayDialog';
import { CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CurrentSubscription {
  status: string;
  end_date: string;
  subscription_plans: { name: string; price: number } | null;
}

const useCurrentSubscription = (landlordId: string | null) =>
  useQuery({
    queryKey: ['current-subscription', landlordId],
    enabled: !!landlordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landlord_subscriptions')
        .select('status, end_date, subscription_plans(name, price)')
        .eq('landlord_id', landlordId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data as CurrentSubscription | null;
    },
  });

export const BillingTab = () => {
  const landlordId = useEffectiveLandlordId();
  const { viewOnly } = useImpersonation();
  const queryClient = useQueryClient();
  const { data: subscription, isLoading } = useCurrentSubscription(landlordId);
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['current-subscription', landlordId] });
    queryClient.invalidateQueries({ queryKey: ['account-status'] });
  };

  const currentPlanName = subscription?.subscription_plans?.name;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Current plan</CardTitle>
          </div>
          <CardDescription>Your active KODI PAP subscription</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : subscription ? (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{subscription.subscription_plans?.name}</span>
                  <Badge variant="outline">{subscription.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Renews on {format(new Date(subscription.end_date), 'PP')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Renew or change plan</CardTitle>
          <CardDescription>Pay instantly with M-Pesa — your plan updates as soon as payment confirms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {PUBLIC_PLANS.map((plan) => (
            <div key={plan.name} className="rounded-lg border p-4 space-y-3">
              <div>
                <div className="font-semibold">{plan.name}</div>
                <div className="text-sm text-muted-foreground">KES {plan.price.toLocaleString()}/mo</div>
              </div>
              <Button
                className="w-full"
                variant={plan.name === currentPlanName ? 'outline' : 'default'}
                disabled={viewOnly}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.name === currentPlanName ? 'Renew' : 'Switch to this plan'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedPlan && (
        <MpesaPayDialog
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          planName={selectedPlan.name}
          amount={selectedPlan.price}
          onActivated={refresh}
        />
      )}
    </div>
  );
};
