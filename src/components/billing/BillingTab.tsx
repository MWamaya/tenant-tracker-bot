import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId, useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PUBLIC_PLANS, PublicPlan } from '@/lib/plans';
import { MpesaPayDialog } from '@/components/billing/MpesaPayDialog';
import { CreditCard, Building2, Users, MessageSquare, Check, ArrowRight, TriangleAlert, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CurrentSubscription {
  status: string;
  end_date: string;
  subscription_plans: { name: string; price: number } | null;
}

const PREPAY_OPTIONS = [
  { months: 1, label: '1 month' },
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
];

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

const useUsageCounts = (landlordId: string | null) =>
  useQuery({
    queryKey: ['billing-usage', landlordId],
    enabled: !!landlordId,
    queryFn: async () => {
      const [properties, tenants] = await Promise.all([
        supabase.from('properties').select('id').eq('landlord_id', landlordId!),
        supabase.from('tenants').select('id').eq('landlord_id', landlordId!),
      ]);
      if (properties.error) throw properties.error;
      if (tenants.error) throw tenants.error;
      return { properties: properties.data?.length ?? 0, tenants: tenants.data?.length ?? 0 };
    },
  });

const NEARING_LIMIT_RATIO = 0.8;

function UsageMeter({
  icon: Icon,
  label,
  used,
  max,
}: {
  icon: typeof Building2;
  label: string;
  used: number;
  max: number | null;
}) {
  const ratio = max ? used / max : 0;
  const nearLimit = max !== null && ratio >= NEARING_LIMIT_RATIO;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className={cn('font-medium', nearLimit ? 'text-warning' : 'text-foreground')}>
          {used} {max !== null ? `/ ${max}` : '(unlimited)'}
        </span>
      </div>
      {max !== null && (
        <Progress
          value={Math.min(ratio * 100, 100)}
          className="h-1.5"
          indicatorClassName={nearLimit ? 'bg-warning' : undefined}
        />
      )}
    </div>
  );
}

export const BillingTab = () => {
  const landlordId = useEffectiveLandlordId();
  const { viewOnly } = useImpersonation();
  const queryClient = useQueryClient();
  const { data: subscription, isLoading } = useCurrentSubscription(landlordId);
  const { data: usage } = useUsageCounts(landlordId);
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [prepayMonths, setPrepayMonths] = useState(1);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['current-subscription', landlordId] });
    queryClient.invalidateQueries({ queryKey: ['account-status'] });
  };

  const currentPlanName = subscription?.subscription_plans?.name;
  const currentIndex = PUBLIC_PLANS.findIndex((p) => p.name === currentPlanName);
  const currentPlan = currentIndex >= 0 ? PUBLIC_PLANS[currentIndex] : null;

  const propertiesNearLimit = !!(
    currentPlan?.maxProperties && usage && usage.properties / currentPlan.maxProperties >= NEARING_LIMIT_RATIO
  );
  const tenantsNearLimit = !!(
    currentPlan?.maxTenants && usage && usage.tenants / currentPlan.maxTenants >= NEARING_LIMIT_RATIO
  );
  const nextPlan = currentIndex >= 0 && currentIndex < PUBLIC_PLANS.length - 1 ? PUBLIC_PLANS[currentIndex + 1] : null;

  const handleRenew = (plan: PublicPlan, months = 1) => {
    setSelectedMonths(months);
    setSelectedPlan(plan);
  };

  const handleSwitch = (plan: PublicPlan) => {
    setSelectedMonths(1);
    setSelectedPlan(plan);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Current plan</CardTitle>
          </div>
          <CardDescription>Your active KODI PAP subscription and how much of it you're using</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          ) : subscription ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold">{subscription.subscription_plans?.name}</span>
                    <Badge variant="outline" className="border-success/40 text-success">
                      {subscription.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Renews {format(new Date(subscription.end_date), 'PP')}
                  </p>
                </div>
              </div>

              {currentPlan && usage && (
                <div className="grid gap-4 sm:grid-cols-2 pt-1">
                  <UsageMeter icon={Building2} label="Properties" used={usage.properties} max={currentPlan.maxProperties} />
                  <UsageMeter icon={Users} label="Tenants" used={usage.tenants} max={currentPlan.maxTenants} />
                </div>
              )}

              {(propertiesNearLimit || tenantsNearLimit) && nextPlan && (
                <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                  <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                  <span>
                    You're close to your {propertiesNearLimit ? 'property' : 'tenant'} limit.{' '}
                    <span className="font-medium text-foreground">{nextPlan.name}</span> gives you{' '}
                    {nextPlan.maxProperties === null ? 'unlimited' : nextPlan.maxProperties} properties and{' '}
                    {nextPlan.maxTenants === null ? 'unlimited' : nextPlan.maxTenants} tenants.
                  </span>
                </div>
              )}

              {currentPlan && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Pay months in advance
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Skip the monthly reminder — pay now for several months at once, added onto your renewal date.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {PREPAY_OPTIONS.map((opt) => (
                      <button
                        key={opt.months}
                        type="button"
                        onClick={() => setPrepayMonths(opt.months)}
                        className={cn(
                          'rounded-md border px-2 py-2 text-center transition-colors',
                          prepayMonths === opt.months
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/40',
                        )}
                      >
                        <div className="text-sm font-semibold">{opt.months === 1 ? '1 mo' : `${opt.months} mo`}</div>
                        <div className={cn('text-xs', prepayMonths === opt.months ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                          KES {(currentPlan.price * opt.months).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button className="w-full" disabled={viewOnly} onClick={() => handleRenew(currentPlan, prepayMonths)}>
                    Pay KES {(currentPlan.price * prepayMonths).toLocaleString()} with M-Pesa
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3 items-start">
        {PUBLIC_PLANS.map((plan, index) => {
          const isCurrent = plan.name === currentPlanName;
          const isUpgrade = currentIndex >= 0 && index > currentIndex;
          const isDowngrade = currentIndex >= 0 && index < currentIndex;
          const below = index > 0 ? PUBLIC_PLANS[index - 1] : null;

          return (
            <Card
              key={plan.name}
              className={cn(
                isCurrent && 'border-primary shadow-sm',
                isDowngrade && 'opacity-70',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current plan</Badge>}
                  {isUpgrade && <Badge variant="outline" className="border-success/40 text-success">Upgrade</Badge>}
                </div>
                <div className="pt-1">
                  <span className="text-2xl font-bold">KES {plan.price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isUpgrade && below ? (
                  <div className="rounded-md bg-success/5 border border-success/20 p-3 text-sm space-y-1.5">
                    <p className="font-medium text-foreground">Everything in {below.name}, plus:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-success shrink-0" />
                        {plan.maxProperties === null
                          ? 'Unlimited properties'
                          : `${plan.maxProperties - (below.maxProperties ?? 0)} more properties`}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-success shrink-0" />
                        {plan.maxTenants === null
                          ? 'Unlimited tenants'
                          : `${plan.maxTenants - (below.maxTenants ?? 0)} more tenants`}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-success shrink-0" />
                        +{plan.smsTokensIncluded - below.smsTokensIncluded} SMS tokens/month
                      </li>
                      {plan.features
                        .filter(
                          (f) =>
                            !below.features.includes(f) &&
                            !/^all .* features$/i.test(f) &&
                            !/^unlimited (properties|tenants)$/i.test(f),
                        )
                        .map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-success shrink-0" />
                            {f}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {plan.maxProperties === null ? 'Unlimited' : plan.maxProperties} properties
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {plan.maxTenants === null ? 'Unlimited' : plan.maxTenants} tenants
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      {plan.smsTokensIncluded} SMS tokens
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : isDowngrade ? 'ghost' : 'default'}
                  disabled={viewOnly}
                  onClick={() => (isCurrent ? handleRenew(plan, 1) : handleSwitch(plan))}
                >
                  {isCurrent ? (
                    'Renew 1 month'
                  ) : isUpgrade ? (
                    <>Upgrade to {plan.name} <ArrowRight className="h-4 w-4 ml-1.5" /></>
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPlan && (
        <MpesaPayDialog
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          planName={selectedPlan.name}
          amount={selectedPlan.price * selectedMonths}
          months={selectedMonths}
          onActivated={refresh}
        />
      )}
    </div>
  );
};
