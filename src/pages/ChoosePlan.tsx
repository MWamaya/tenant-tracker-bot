import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, LogOut, Phone, Mail } from 'lucide-react';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';

const plans = [
  {
    name: 'Starter',
    price: 'KES 500',
    period: '/month',
    description: 'For small landlords getting started',
    features: ['Up to 10 houses', 'Manual payment entry', 'Basic reports', 'Email support'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'KES 1,500',
    period: '/month',
    description: 'For growing property portfolios',
    features: [
      'Up to 50 houses',
      'M-Pesa & bank auto-sync',
      'SMS reminders (100 tokens)',
      'PDF & CSV reports',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Premium',
    price: 'KES 3,500',
    period: '/month',
    description: 'For established property managers',
    features: [
      'Unlimited houses',
      'All Pro features',
      'SMS reminders (500 tokens)',
      'Multi-property management',
      'Dedicated account manager',
    ],
    highlighted: false,
  },
];

const ChoosePlan = () => {
  const { signOut } = useAuth();

  return (
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
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
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
                  onClick={() =>
                    document
                      .getElementById('payment-instructions')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card id="payment-instructions" className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Activate Your Account</CardTitle>
            </div>
            <CardDescription>
              Complete payment using the details below. Your account will be activated by
              our team within 24 hours of payment confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <div>
                <span className="font-medium text-foreground">M-Pesa Paybill:</span>{' '}
                <span className="text-muted-foreground">247247</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Account Number:</span>{' '}
                <span className="text-muted-foreground">Your registered phone number</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Amount:</span>{' '}
                <span className="text-muted-foreground">As per the plan you chose</span>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="font-semibold text-sm">Need help?</div>
              <a
                href="tel:+254700000000"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" /> +254 700 000 000
              </a>
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
    </div>
  );
};

export default ChoosePlan;
