import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, ShieldCheck, Wallet, ArrowRight, Check } from 'lucide-react';
import heroImage from '@/assets/landing-hero.jpg';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';

const Landing = () => {
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
        <Link
          to="/auth"
          className="text-sm font-semibold text-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
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
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KODI PAP. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
