import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, ShieldCheck, Wallet, ArrowRight, Check } from 'lucide-react';
import heroImage from '@/assets/landing-hero.jpg';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';

const Landing = () => {
  const [showPricing, setShowPricing] = useState(false);
  const pricingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (showPricing && pricingRef.current) {
      pricingRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showPricing]);
  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImage}
          alt="Modern apartment buildings at sunset"
          width={1920}
          height={1088}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/95" />
      </div>

      {/* Header */}
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={kodiPapLogo} alt="KODI PAP" className="h-10 w-auto" />
        </div>
        <nav className="flex items-center gap-4 sm:gap-6">
          <a
            href="#pricing"
            className="text-sm font-semibold text-foreground hover:text-primary underline-offset-4 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              setShowPricing(true);
            }}
          >
            Pricing
          </a>
          <Link
            to="/auth"
            className="text-sm font-semibold text-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="px-4 sm:px-8 pt-12 sm:pt-20 pb-16 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
          Collect rent the smart way with{' '}
          <span className="text-primary">KODI PAP</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Effortless rent collection, automatic payment matching, tenant statements
          and reminders — built for landlords in Kenya.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">
              Log in to your account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Create an account</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <div className="rounded-xl border bg-card/80 backdrop-blur p-5 shadow-sm">
            <Building2 className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">Manage Properties</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Group houses under properties and track every unit at a glance.
            </p>
          </div>
          <div className="rounded-xl border bg-card/80 backdrop-blur p-5 shadow-sm">
            <Wallet className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">Automatic Payments</h3>
            <p className="text-sm text-muted-foreground mt-1">
              M-Pesa &amp; bank payments matched automatically to tenants.
            </p>
          </div>
          <div className="rounded-xl border bg-card/80 backdrop-blur p-5 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">Secure &amp; Reliable</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your data is isolated and protected with enterprise-grade security.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <section id="pricing" className="mt-20 text-left">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Pick a plan and proceed to payment to activate your account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                name: 'Starter',
                price: 'KES 500',
                features: ['Up to 10 houses', 'Manual payment entry', 'Basic reports', 'Email support'],
                highlighted: false,
              },
              {
                name: 'Pro',
                price: 'KES 1,500',
                features: ['Up to 50 houses', 'M-Pesa & bank auto-sync', 'SMS reminders (100 tokens)', 'Priority support'],
                highlighted: true,
              },
              {
                name: 'Premium',
                price: 'KES 3,500',
                features: ['Unlimited houses', 'All Pro features', 'SMS reminders (500 tokens)', 'Dedicated manager'],
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border bg-card/80 backdrop-blur p-5 shadow-sm flex flex-col ${
                  plan.highlighted ? 'border-primary shadow-lg sm:scale-105' : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-5 w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  <Link to="/subscribe">Choose {plan.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KODI PAP. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
