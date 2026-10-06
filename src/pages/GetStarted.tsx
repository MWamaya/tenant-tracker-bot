import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { PageSeo } from '@/components/seo/PageSeo';
import { supabase } from '@/integrations/supabase/client';
import { PUBLIC_PLANS } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';

const requestSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name').max(200),
  email: z.string().trim().email('Enter a valid email address').max(320),
  phone: z.string().trim().min(1, 'Enter your phone number').max(32),
  plan: z.enum(['Starter', 'Pro', 'Premium'], { errorMap: () => ({ message: 'Choose a plan' }) }),
});

const GetStarted = () => {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('plan');
  const plans = PUBLIC_PLANS;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Preselect from ?plan= only if it names a real plan.
  useEffect(() => {
    if (!plan && preselected && plans.some((p) => p.name === preselected)) {
      setPlan(preselected);
    }
  }, [plan, preselected, plans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = requestSchema.safeParse({ fullName, email, phone, plan });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.functions.invoke('onboarding-submit', {
      body: { fullName, email, phone, plan, website },
    });
    setIsSubmitting(false);

    if (error || (data && 'error' in data)) {
      toast.error((data as { error?: string })?.error || 'Could not submit your request. Please try again.');
      return;
    }

    setSubmitted(true);
    toast.success("Request sent — we'll be in touch soon.");
  };

  return (
    <>
      <PageSeo
        title="Get Started — KODI PAP"
        description="Tell us about your rental properties and we'll help you get set up on KODI PAP."
        path={ROUTES.GET_STARTED}
        noindex
      />
      <div className="min-h-screen px-4 sm:px-8 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <Link
              to={ROUTES.LANDING}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> KODI PAP
            </Link>
            <img src={kodiPapLogo} alt="KODI PAP" className="h-6 w-auto" />
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Get started with KODI PAP
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us a bit about yourself and pick a plan. Our team will reach out to set up
            your account — no payment needed right now.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-xl border border-success/30 bg-success/10 px-5 py-4 text-sm text-foreground">
              Thanks, {fullName.split(' ')[0]} — your request is in. We'll reach out to{' '}
              <strong>{email}</strong> or <strong>{phone}</strong> soon to get you set up on
              the {plan} plan.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Honeypot — hidden from real users, left empty by them */}
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Wanjiru"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07xx xxx xxx"
                    maxLength={32}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={320}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const selected = plan === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setPlan(p.name)}
                        className={`relative text-left rounded-xl border p-4 transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-input hover:border-primary/50'
                        }`}
                      >
                        {p.highlighted && (
                          <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{p.name}</span>
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          KES {p.price.toLocaleString()}
                          <span className="text-xs"> /month</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {p.maxProperties === null ? 'Unlimited' : p.maxProperties} properties ·{' '}
                          {p.maxTenants === null ? 'Unlimited' : p.maxTenants} tenants
                        </div>
                        <ul className="mt-2 space-y-1">
                          {p.features.slice(0, 2).map((f) => (
                            <li key={f} className="text-xs text-muted-foreground">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2 w-full sm:w-auto">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Submitting…' : 'Submit request'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link to={ROUTES.AUTH} className="underline hover:no-underline">
                  Log in
                </Link>{' '}
                instead.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default GetStarted;
