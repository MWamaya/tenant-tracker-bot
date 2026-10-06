import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  X,
  FileText,
  Bell,
  BarChart3,
  UserPlus,
  Smartphone,
  ClipboardCheck,
  Menu,
  RefreshCw,
  Landmark,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { useInView } from '@/hooks/useInView';
import heroImage from '@/assets/landing-hero.jpg';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';
import { PageSeo } from '@/components/seo/PageSeo';
import { PUBLIC_PLANS } from '@/lib/plans';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const WITHOUT = [
  'Search through M-Pesa messages',
  'Update spreadsheets manually',
  'Ask tenants who has paid',
  'Calculate arrears by hand',
  'Chase late payments',
];

const WITH = [
  'Payments matched automatically',
  'Tenant balances stay up to date',
  'Statements generated instantly',
  'Automated rent reminders',
  'Portfolio visibility at a glance',
];

const STEPS = [
  {
    icon: UserPlus,
    title: 'Add your properties',
    description: 'Set up houses, units and tenants in minutes — no spreadsheets required.',
  },
  {
    icon: Smartphone,
    title: 'Tenants pay normally',
    description: "M-Pesa or bank transfer. Your tenants don't need to learn a new process.",
  },
  {
    icon: ClipboardCheck,
    title: 'Payment gets matched',
    description: 'KODI PAP identifies the payment and connects it to the right tenant.',
  },
  {
    icon: BarChart3,
    title: 'You see everything',
    description: 'Track collections, arrears, occupancy and statements from one dashboard.',
  },
];

const SHOWCASE_POINTS = [
  'See who has paid and who hasn’t',
  'Track outstanding balances',
  'Generate tenant statements',
  'Understand income and occupancy',
];


const FEATURES = [
  {
    icon: RefreshCw,
    title: 'Automatic payment matching',
    description: 'Match M-Pesa and bank payments to the right tenant without manual reconciliation.',
  },
  {
    icon: Building2,
    title: 'Property management',
    description: 'Organize properties, units and tenants in one clean workspace.',
  },
  {
    icon: FileText,
    title: 'Tenant statements',
    description: 'Generate professional, shareable statements in seconds.',
  },
  {
    icon: Bell,
    title: 'Rent reminders',
    description: 'Send timely SMS reminders so fewer payments become overdue.',
  },
  {
    icon: BarChart3,
    title: 'Reports & reconciliation',
    description: 'See collections, arrears, occupancy and income trends across your portfolio.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    description: 'Keep your rental and tenant information protected and separated by account.',
  },
];

const FAQS = [
  {
    question: 'Is my M-Pesa and tenant data safe?',
    answer:
      'Yes. Your rental and tenant data is kept separate per landlord account, and access is restricted to authorised users. We never sell your information — see our Privacy Policy for details.',
  },
  {
    question: 'What happens if a payment fails to match a tenant?',
    answer:
      "Unmatched payments show up clearly on your dashboard so you can resolve them manually in a few clicks — nothing gets silently lost or misallocated.",
  },
  {
    question: 'How do I pay, and can I cancel anytime?',
    answer:
      'Subscriptions are paid manually via M-Pesa — no card required, no auto-charging. You can cancel anytime by contacting support; cancelling just stops future renewals.',
  },
  {
    question: 'Do my tenants need to do anything differently?',
    answer:
      'No. Tenants keep paying by M-Pesa or bank transfer exactly as they do today. KODI PAP matches and records the payment automatically on your side.',
  },
  {
    question: 'How quickly is my account set up?',
    answer:
      "After you submit the Get Started form, our team sets up your account and reaches out — usually within one business day.",
  },
];

/** Small uppercase label above a section heading. */
const Kicker = ({
  children,
  className = 'text-primary',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${className}`}>{children}</div>
);

/** Section wrapper that fades/slides up the first time it scrolls into view. */
const Reveal = ({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
};

/** The "live dashboard" mockup card used in the hero. */
const DashboardMockup = () => (
  <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
    <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
      <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
      <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
      <span className="ml-2 text-xs text-muted-foreground">app.kodipap.com</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] min-h-[340px] sm:min-h-[390px]">
      <aside className="hidden sm:block bg-muted/40 border-r px-3 py-4 text-xs">
        <strong className="block mb-4 px-2 text-sm">KODI PAP</strong>
        <div className="rounded-md bg-primary/10 text-primary font-semibold px-2.5 py-2 mb-1">Overview</div>
        {['Properties', 'Tenants', 'Payments', 'Statements', 'Reports'].map((item) => (
          <div key={item} className="px-2.5 py-2 text-muted-foreground">
            {item}
          </div>
        ))}
      </aside>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Good morning</h3>
            <p className="text-xs text-muted-foreground">Here's your rental portfolio</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success text-[10px] font-semibold px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="min-w-0 rounded-lg border p-2.5">
            <span className="block text-[10px] text-muted-foreground truncate">Collected</span>
            <span className="block text-sm font-bold text-foreground mt-1 whitespace-nowrap">KES 284,500</span>
            <span className="text-[10px] text-success">↑ 12.4%</span>
          </div>
          <div className="min-w-0 rounded-lg border p-2.5">
            <span className="block text-[10px] text-muted-foreground truncate">Outstanding</span>
            <span className="block text-sm font-bold text-foreground mt-1 whitespace-nowrap">KES 36,000</span>
            <span className="text-[10px] text-warning">3 tenants</span>
          </div>
          <div className="min-w-0 rounded-lg border p-2.5 col-span-2 sm:col-span-1">
            <span className="block text-[10px] text-muted-foreground truncate">Occupancy</span>
            <span className="block text-sm font-bold text-foreground mt-1 whitespace-nowrap">94%</span>
            <span className="text-[10px] text-muted-foreground">47/50 units</span>
          </div>
        </div>

        <div className="rounded-lg border p-3 mt-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Monthly collections</span>
            <span className="text-success">KES 284.5K</span>
          </div>
          <div className="flex items-end gap-1.5 h-16 mt-3">
            {[30, 45, 55, 68, 62, 82].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 5 ? 'bg-primary' : 'bg-primary/25'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden mt-3">
          {[
            { name: 'John Kamau · Unit 4B', amount: 'KES 15,000' },
            { name: 'Mary Wanjiku · Unit 2A', amount: 'KES 12,000' },
          ].map((row) => (
            <div key={row.name} className="flex items-center justify-between px-3 py-2 text-xs border-b last:border-0">
              <span className="text-muted-foreground">{row.name}</span>
              <span className="font-semibold">{row.amount}</span>
              <span className="flex items-center gap-1 text-success font-medium">
                <Check className="h-3 w-3" /> Matched
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const Landing = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const plans = PUBLIC_PLANS;

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
      setShowScrollToBottom(!nearBottom);
      setShowScrollToTop(window.scrollY > window.innerHeight * 0.75);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <PageSeo
        title="KODI PAP — Smart Rent Collection for Kenyan Landlords"
        description="Collect rent the smart way. KODI PAP automates M-Pesa and bank payment matching, tenant statements and reminders for landlords in Kenya."
        path="/"
      />
      <div className="min-h-screen">
        {/* Fixed nav — pill on desktop, full-width bar on mobile (logo far left, hamburger far right) */}
        <header className="fixed top-4 inset-x-4 sm:inset-x-0 z-50 flex sm:justify-center pointer-events-none">
          <nav
            className={`pointer-events-auto w-full sm:w-fit border bg-background/70 backdrop-blur-xl shadow-lg transition-[border-radius] duration-200 ${
              menuOpen ? 'rounded-2xl' : 'rounded-2xl sm:rounded-full'
            }`}
          >
            <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 px-3 sm:px-2 py-2 sm:py-1.5">
              <Link to={ROUTES.LANDING} className="sm:ml-1.5 sm:mr-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <img src={kodiPapLogo} alt="KODI PAP" className="h-6 w-auto" />
              </Link>

              <div className="hidden sm:flex items-center gap-1">
                <a href="#how" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  How it works
                </a>
                <a href="#features" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Features
                </a>
                <a href="#pricing" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Pricing
                </a>
                <Button asChild size="sm" className="rounded-full gap-1.5">
                  <Link to={ROUTES.GET_STARTED}>
                    Sign up <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Mobile: hamburger toggle, pinned to the far right */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="sm:hidden flex items-center justify-center h-11 w-11 -mr-1 rounded-full text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* Mobile dropdown panel */}
            <div
              className={`sm:hidden grid transition-all duration-200 ease-out ${
                menuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-1 px-3 pb-3 pt-1">
                  {[
                    { href: '#how', label: 'How it works' },
                    { href: '#features', label: 'Features' },
                    { href: '#pricing', label: 'Pricing' },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </a>
                  ))}
                  <Button asChild size="sm" className="mt-1 w-full rounded-full">
                    <Link to={ROUTES.GET_STARTED} onClick={() => setMenuOpen(false)}>
                      Sign up
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </nav>
        </header>

        {/* Hero — text sits directly on the photo, no card behind it */}
        <section className="relative min-h-[88vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <img
              src={heroImage}
              alt="Modern apartment block in Nairobi, Kenya"
              width={1920}
              height={1078}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_25%_45%,hsl(var(--background)/0.55),transparent_70%)]" />
          </div>

          <Button
            asChild
            size="sm"
            className="absolute top-20 right-4 sm:top-6 sm:right-8 z-10 gap-1.5 shadow-lg"
          >
            <Link to={ROUTES.AUTH}>
              Log in <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>

          <div className="px-4 sm:px-8 pt-28 pb-16 sm:py-16 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className="animate-slide-up">
                <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-card/90 backdrop-blur shadow-sm text-success px-3 py-1 text-xs font-bold">
                  🇰🇪 Built for Kenyan landlords
                </span>

                <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[0.98] text-foreground drop-shadow-sm">
                  Stop chasing rent.
                  <br />
                  <span className="text-primary">Start managing it.</span>
                </h1>

                <p className="mt-5 text-base sm:text-lg text-foreground/80 max-w-lg drop-shadow-sm">
                  KODI PAP automatically matches M-Pesa and bank payments to your tenants,
                  tracks arrears, and gives you a clear view of your entire rental business.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg" className="gap-2">
                    <Link to={ROUTES.GET_STARTED}>
                      Start managing your properties <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-card/80 backdrop-blur">
                    <a href="#how">See how it works</a>
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground/80 drop-shadow-sm">
                  <span className="font-semibold text-foreground">🇰🇪 Kenya-first</span>
                  <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5 text-success" /> M-Pesa</span>
                  <span className="flex items-center gap-1"><Landmark className="h-3.5 w-3.5 text-success" /> Bank payments</span>
                  <span className="flex items-center gap-1"><Bell className="h-3.5 w-3.5 text-success" /> Automated reminders</span>
                </div>
              </div>

              <Reveal className="relative">
                <div className="absolute -inset-6 bg-primary/10 rounded-[2rem] -z-10 hidden sm:block blur-2xl" />
                <DashboardMockup />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Why KODI PAP — before/after */}
        <section id="proof" className="px-4 sm:px-8 py-16 sm:py-24 bg-foreground text-background">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <Kicker className="text-success">A better way to collect rent</Kicker>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Less chasing. More control.</h2>
              <p className="mt-3 text-background/70 max-w-xl mx-auto">
                Replace M-Pesa screenshots, WhatsApp messages and spreadsheets with one clear
                system built around the way Kenyan landlords actually work.
              </p>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
              <Reveal>
                <div className="h-full rounded-2xl border border-background/20 bg-background/[0.08] p-6">
                  <h3 className="font-semibold mb-4">Without KODI PAP</h3>
                  <ul className="space-y-3">
                    {WITHOUT.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-background/70">
                        <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="h-full rounded-2xl bg-gradient-to-br from-success to-success/80 p-6 shadow-2xl">
                  <h3 className="font-semibold mb-4 text-success-foreground">With KODI PAP</h3>
                  <ul className="space-y-3">
                    {WITH.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-success-foreground/90">
                        <Check className="h-4 w-4 text-success-foreground mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-4 sm:px-8 py-16 sm:py-24 max-w-5xl mx-auto">
          <Reveal className="text-center mb-10 sm:mb-14 max-w-xl mx-auto">
            <Kicker>How it works</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              From payment to record, automatically.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your tenants keep paying the way they already do. KODI PAP handles the
              tracking behind the scenes.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <div className="h-full rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Showcase */}
        <section className="px-4 sm:px-8 py-16 sm:py-24 bg-muted/40">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <Kicker>Your rental business at a glance</Kicker>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Know what's happening across every property.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Stop piecing together information from different places. KODI PAP gives
                you one reliable view of your rental portfolio.
              </p>
              <ul className="mt-6 space-y-3">
                {SHOWCASE_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-2.5 font-medium text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
                <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="min-w-0 rounded-lg border p-3">
                      <span className="block text-[10px] text-muted-foreground truncate">Properties</span>
                      <span className="block text-xl font-bold text-foreground mt-1">8</span>
                      <span className="text-[10px] text-muted-foreground truncate">2 locations</span>
                    </div>
                    <div className="min-w-0 rounded-lg border p-3">
                      <span className="block text-[10px] text-muted-foreground truncate">Units</span>
                      <span className="block text-xl font-bold text-foreground mt-1">50</span>
                      <span className="text-[10px] text-success truncate">47 occupied</span>
                    </div>
                    <div className="min-w-0 rounded-lg border p-3">
                      <span className="block text-[10px] text-muted-foreground">Arrears</span>
                      <span className="block text-xl font-bold text-foreground mt-1">KES 36K</span>
                      <span className="text-[10px] text-warning">3 tenants</span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 mt-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Collections overview</span>
                      <span className="text-muted-foreground">Last 6 months</span>
                    </div>
                    <div className="flex items-end gap-2 h-24 mt-3">
                      {[30, 45, 55, 68, 62, 82].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${i === 5 ? 'bg-primary' : 'bg-primary/25'}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 sm:px-8 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-10 sm:mb-14 max-w-xl mx-auto">
              <Kicker>Everything you need</Kicker>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Run your rentals without the busywork.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Focused tools for landlords who want less admin and more control.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={(i % 3) * 100}>
                  <div className="h-full rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-3.5 font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-4 sm:px-8 py-16 sm:py-24 bg-muted/40">
          <Reveal className="text-center mb-10 sm:mb-14 max-w-xl mx-auto">
            <Kicker>Simple pricing</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Start small. Scale as you grow.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Choose the plan that fits your portfolio today. Upgrade as your rental business grows.
            </p>
          </Reveal>

          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan, i) => (
                  <Reveal key={plan.name} delay={i * 100}>
                    <div
                      className={`relative h-full rounded-2xl border bg-card p-6 shadow-sm flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                        plan.highlighted ? 'border-primary shadow-lg sm:scale-105' : ''
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                          Most Popular
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <div className="mt-3">
                        <span className="text-3xl font-bold tracking-tight text-foreground">
                          KES {plan.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground"> / month</span>
                      </div>
                      <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{plan.maxProperties === null ? 'Unlimited' : plan.maxProperties} properties</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{plan.maxTenants === null ? 'Unlimited' : plan.maxTenants} tenants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{plan.smsTokensIncluded} SMS tokens</span>
                        </div>
                      </div>
                      <ul className="mt-5 space-y-2.5 flex-1 pt-4 border-t">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        asChild
                        className="mt-6 w-full transition-transform hover:scale-[1.02]"
                        variant={plan.highlighted ? 'default' : 'outline'}
                      >
                        <Link to={`${ROUTES.GET_STARTED}?plan=${encodeURIComponent(plan.name)}`}>Choose {plan.name}</Link>
                      </Button>
                    </div>
                  </Reveal>
                ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-4 sm:px-8 py-16 sm:py-24">
          <Reveal className="text-center mb-10 sm:mb-14 max-w-xl mx-auto">
            <Kicker>Questions</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Frequently asked questions.
            </h2>
          </Reveal>
          <Reveal className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-left text-foreground">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="px-4 sm:px-8 py-16 sm:py-24 bg-gradient-to-br from-foreground to-primary">
          <Reveal className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-background">
              Stop chasing rent.
            </h2>
            <p className="mt-3 text-background/70">
              Start managing your properties with KODI PAP.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7 gap-2">
              <Link to={ROUTES.GET_STARTED}>
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-8 py-8 max-w-5xl mx-auto text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} KODI PAP. Built for Kenyan landlords. 🇰🇪</span>
            <div className="flex items-center gap-5">
              <a href="#features" className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Features</a>
              <a href="#pricing" className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Pricing</a>
              <Link to={ROUTES.AUTH} className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Log in</Link>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
            <Link to={ROUTES.PRIVACY_POLICY} className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</Link>
            <Link to={ROUTES.TERMS_OF_USE} className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms of Use</Link>
            <Link to={ROUTES.COOKIE_POLICY} className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cookie Policy</Link>
            <Link to={ROUTES.REFUND_CANCELLATION} className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Refund & Cancellation</Link>
            <Link to={ROUTES.CONTACT} className="rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Contact & Support</Link>
          </div>
        </footer>

        <div
          className={`group fixed bottom-20 right-4 sm:right-8 z-40 transition-all duration-200 ${
            showScrollToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 whitespace-nowrap rounded-full border bg-background/90 backdrop-blur-xl px-3 py-1.5 text-xs font-medium text-foreground shadow-lg opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
            Scroll to top
          </span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="flex items-center justify-center h-11 w-11 rounded-full border bg-background/90 backdrop-blur-xl shadow-lg text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`group fixed bottom-6 right-4 sm:right-8 z-40 transition-all duration-200 ${
            showScrollToBottom ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 whitespace-nowrap rounded-full border bg-background/90 backdrop-blur-xl px-3 py-1.5 text-xs font-medium text-foreground shadow-lg opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
            Scroll to bottom
          </span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
            aria-label="Scroll to bottom"
            className="flex items-center justify-center h-11 w-11 rounded-full border bg-background/90 backdrop-blur-xl shadow-lg text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-dance group-hover:animate-none"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Landing;
