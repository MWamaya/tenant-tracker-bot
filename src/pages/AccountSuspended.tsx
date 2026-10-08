import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogOut, Mail, CreditCard } from 'lucide-react';
import { PUBLIC_PLANS, PublicPlan, calcPrepayTotal, ANNUAL_DISCOUNT } from '@/lib/plans';
import { MpesaPayDialog } from '@/components/billing/MpesaPayDialog';
import { ROUTES } from '@/lib/routes';

const AccountSuspended = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const months = billing === 'annual' ? 12 : 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-destructive/40">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription className="text-base">
            Your KODI PAP account has been suspended. Pay for a plan below to restore access
            instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CreditCard className="h-4 w-4 text-primary" />
              Reactivate with M-Pesa
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                  billing === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Annual
                <span className={`rounded-full text-[9px] font-bold px-1 py-0.5 ${billing === 'annual' ? 'bg-primary-foreground/20' : 'bg-success/10 text-success'}`}>
                  -{ANNUAL_DISCOUNT * 100}%
                </span>
              </button>
            </div>
            <div className="space-y-2">
              {PUBLIC_PLANS.map((plan) => {
                const total = calcPrepayTotal(plan.price, months);
                return (
                  <Button
                    key={plan.name}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <span>{plan.name}</span>
                    <span className="text-muted-foreground">
                      KES {total.toLocaleString()}{billing === 'annual' ? '/yr' : '/mo'}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="font-semibold text-sm">Need help?</div>
            <a
              href="mailto:support@kodipap.com"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Mail className="h-4 w-4" /> support@kodipap.com
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Once payment is confirmed, your account reactivates automatically.
          </p>

          <Button variant="outline" className="w-full" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {selectedPlan && (
        <MpesaPayDialog
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          planName={selectedPlan.name}
          amount={calcPrepayTotal(selectedPlan.price, months)}
          months={months}
          onActivated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['account-status', user?.id] });
            navigate(ROUTES.DASHBOARD);
          }}
        />
      )}
    </div>
  );
};

export default AccountSuspended;
