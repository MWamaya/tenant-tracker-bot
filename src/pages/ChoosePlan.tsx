import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { PUBLIC_PLANS, PublicPlan } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, LogOut, Mail, Building2, Users, MessageSquare } from 'lucide-react';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';
import { PageSeo } from '@/components/seo/PageSeo';
import { ROUTES } from '@/lib/routes';
import { MpesaPayDialog } from '@/components/billing/MpesaPayDialog';

const ChoosePlan = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const plans = PUBLIC_PLANS;
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null);

  return (
    <>
      <PageSeo
        title="Choose your plan — KODI PAP"
        description="Pick a KODI PAP subscription plan to activate your landlord account."
        path={ROUTES.SUBSCRIBE}
        noindex
      />
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <img src={kodiPapLogo} alt="KODI PAP Logo" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm sm:text-base">
            Welcome to KODI PAP! Select a subscription plan to activate your account and
            start managing your properties.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3 mb-8">
          {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={
                    plan.highlighted
                      ? 'border-primary shadow-lg relative md:scale-105'
                      : 'border-border/60'
                  }
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2">
                      <span className="text-3xl font-bold">KES {plan.price.toLocaleString()}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{plan.maxProperties === null ? 'Unlimited' : plan.maxProperties} properties</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary shrink-0" />
                        <span>{plan.maxTenants === null ? 'Unlimited' : plan.maxTenants} tenants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                        <span>{plan.smsTokensIncluded} SMS tokens</span>
                      </div>
                    </div>
                    <ul className="space-y-2 pt-2 border-t">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      Choose {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Need help?</CardTitle>
            <CardDescription>
              Pick a plan above to pay instantly with M-Pesa — your account activates as soon as
              payment is confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <a
                href="mailto:support@kodipap.com"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" /> support@kodipap.com
              </a>
            </div>

            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedPlan && (
        <MpesaPayDialog
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          planName={selectedPlan.name}
          amount={selectedPlan.price}
          onActivated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['account-status', user?.id] });
            navigate(ROUTES.DASHBOARD);
          }}
        />
      )}
    </div>
    </>
  );
};

export default ChoosePlan;
