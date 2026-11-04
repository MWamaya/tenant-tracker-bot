import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2, ShieldCheck } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { PageSeo } from '@/components/seo/PageSeo';
import { supabase } from '@/integrations/supabase/client';
import { PUBLIC_PLANS } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';
import heroImage from '@/assets/new landings/Pipeline-estate.jpg';

const requestSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name').max(200),
  email: z.string().trim().email('Enter a valid email address').max(320),
  phone: z.string().trim().min(1, 'Enter your phone number').max(32),
  plan: z.enum(['Starter', 'Pro', 'Premium'], { errorMap: () => ({ message: 'Choose a plan' }) }),
});

const NEXT_STEPS = [
  { title: 'We review your request', body: 'Our team gets your details and the plan you picked.' },
  { title: 'We set up your account', body: 'Usually within one business day — we call or email you.' },
  { title: 'You start collecting', body: 'Log in and watch M-Pesa and bank payments match to tenants.' },
];

const NextSteps = ({ tone = 'light' }: { tone?: 'light' | 'dark' }) => (
  <ol className="space-y-4">
    {NEXT_STEPS.map((step, i) => (
      <li key={step.title} className="flex gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            tone === 'dark' ? 'bg-background/15 text-background' : 'bg-primary/10 text-primary'
          }`}
        >
          {i + 1}
        </span>
        <div>
          <p className={`text-sm font-semibold ${tone === 'dark' ? 'text-background' : 'text-foreground'}`}>{step.title}</p>
          <p className={`text-sm ${tone === 'dark' ? 'text-background/70' : 'text-muted-foreground'}`}>{step.body}</p>
        </div>
      </li>
    ))}
  </ol>
);

const StepHeading = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex items-center gap-2.5">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
    <h2 className="text-base font-semibold text-foreground">{children}</h2>
  </div>
);

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
      <div className="min-h-screen lg:grid lg:grid-cols-[5fr_6fr]">
        {/* Brand panel — full photo on desktop, plain intro on mobile */}
        <aside className="relative px-4 pt-6 pb-6 sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12 lg:sticky lg:top-0 lg:h-screen lg:text-background overflow-hidden">
          <img
            src={heroImage}
            alt=""
            aria-hidden
            className="hidden lg:block absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div aria-hidden className="hidden lg:block absolute inset-0 -z-10 bg-foreground/85" />

          <div className="flex items-center justify-between lg:justify-start lg:gap-4">
            <Link
              to={ROUTES.LANDING}
              className="inline-flex items-center gap-1.5 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors lg:text-background/80 lg:hover:text-background"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <Link to={ROUTES.LANDING} className="lg:hidden">
              <img src={kodiPapLogo} alt="KODI PAP" className="h-8 w-auto" />
            </Link>
          </div>

          <div className="mt-2 lg:mt-0">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground lg:text-background text-balance">
              Get started with KODI PAP
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground lg:text-background/75 max-w-md">
              Pick a plan and tell us a bit about yourself. Our team sets up your account —
              no payment needed right now.
            </p>
            <div className="mt-8 hidden lg:block">
              <NextSteps tone="dark" />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-2 text-sm text-background w-fit">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            We never touch your money — it goes straight to your M-Pesa or bank
          </div>
        </aside>

        <main className="px-4 sm:px-8 lg:px-12 pb-0 lg:py-16 lg:flex lg:items-center">
          <div className="w-full max-w-2xl mx-auto">
            {submitted ? (
              <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm my-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                  Thanks, {fullName.split(' ')[0]} — your request is in.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll reach out to <strong className="text-foreground">{email}</strong> or{' '}
                  <strong className="text-foreground">{phone}</strong> soon to get you set up on
                  the <strong className="text-foreground">{plan}</strong> plan.
                </p>
                <div className="mt-6 border-t pt-6">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">What happens next</p>
                  <NextSteps />
                </div>
                <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
                  <Link to={ROUTES.LANDING}>Back to home</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-7 pt-2 lg:pt-0">
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

                <section className="space-y-3">
                  <StepHeading n={1}>Choose a plan</StepHeading>
                  <div className="-mx-4 sm:mx-0 flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pt-3 pb-2 scroll-px-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                    {plans.map((p) => {
                      const selected = plan === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setPlan(p.name)}
                          className={`relative w-[72%] shrink-0 snap-start sm:w-auto text-left rounded-xl border bg-card p-4 transition-colors ${
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
                            {p.maxProperties === null ? 'Unlimited' : p.maxProperties}{' '}
                            {p.maxProperties === 1 ? 'property' : 'properties'} ·{' '}
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
                </section>

                <section className="space-y-4">
                  <StepHeading n={2}>Your details</StepHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        autoComplete="name"
                        className="h-11"
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
                        inputMode="tel"
                        autoComplete="tel"
                        className="h-11"
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
                      autoComplete="email"
                      className="h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      maxLength={320}
                      required
                    />
                  </div>
                </section>

                {/* Submit sticks to the bottom of the screen on mobile so it is always reachable */}
                <div className="sticky bottom-0 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                  <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2 w-full sm:w-auto">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Submitting…' : 'Submit request'}
                  </Button>
                </div>

                <div className="space-y-5 pb-8 lg:hidden">
                  <div className="rounded-2xl border bg-muted/40 p-5">
                    <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">What happens next</p>
                    <NextSteps />
                  </div>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    We never touch your money — it goes straight to your M-Pesa or bank.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground pb-8 hidden lg:block">
                  Already have an account?{' '}
                  <Link to={ROUTES.AUTH} className="inline-block py-2 underline hover:no-underline">
                    Log in
                  </Link>{' '}
                  instead.
                </p>
              </form>
            )}
            {!submitted && (
              <p className="text-xs text-muted-foreground pb-8 lg:hidden">
                Already have an account?{' '}
                <Link to={ROUTES.AUTH} className="inline-block py-2 underline hover:no-underline">
                  Log in
                </Link>{' '}
                instead.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default GetStarted;
