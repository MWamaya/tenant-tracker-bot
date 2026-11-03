import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Check,
  X,
  FileText,
  Bell,
  BarChart3,
  UserPlus,
  Smartphone,
  ClipboardCheck,
  RefreshCw,
  Landmark,
  Users,
  MessageSquare,
  Mail,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import heroImagePipelineStreet from '@/assets/new landings/Pipeline-Estate-i-Nairobi-Kenya-Afrika.jpg';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';
import { PageSeo } from '@/components/seo/PageSeo';
import { PUBLIC_PLANS, ENTERPRISE_PLAN, calcPrepayTotal, ANNUAL_DISCOUNT } from '@/lib/plans';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Add your properties',
    description: 'Set up houses, units and tenants in minutes — no spreadsheets required.',
  },
  {
    icon: Mail,
    title: 'Connect your payment channel',
    description:
      "Connect supported M-Pesa feeds or forward bank receipts for review. Rent goes straight to your account.",
  },
  {
    icon: Smartphone,
    title: 'Tenants pay normally',
    description: "M-Pesa or bank transfer. Your tenants don't need to learn a new process.",
  },
  {
    icon: ClipboardCheck,
    title: 'Review and match',
    description: 'Supported M-Pesa feeds can match automatically. Check forwarded receipts against your bank statement before confirming them.',
  },
  {
    icon: BarChart3,
    title: 'You see everything',
    description: 'Track collections, arrears, occupancy and statements from one dashboard.',
  },
];

const FEATURES = [
  {
    icon: RefreshCw,
    title: 'Payment tracking',
    description: 'Match supported M-Pesa feeds automatically. Review and confirm forwarded bank receipts.',
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
    question: 'Does KODI PAP ever hold or touch my rent money?',
    answer:
      'No. Your tenants pay rent directly into your own M-Pesa or bank account, exactly as they do today — we never receive, hold, or move that money. KODI PAP helps track payments. Supported M-Pesa feeds can match automatically; forwarded receipts need your confirmation.',
  },
  {
    question: 'Is my M-Pesa and tenant data safe?',
    answer:
      'Yes. Your rental and tenant data is kept separate per landlord account, and access is restricted to authorised users. We never sell your information — see our Privacy Policy for details.',
  },
  {
    question: 'What happens if a payment fails to match a tenant?',
    answer:
      "Unmatched payments and forwarded receipts appear in Needs Review. Check receipts against your bank statement before confirming a payment.",
  },
  {
    question: 'How do I pay, and can I cancel anytime?',
    answer:
      'Subscriptions are paid manually via M-Pesa — no card required, no auto-charging. You can cancel anytime by contacting support; cancelling just stops future renewals.',
  },
  {
    question: 'Do my tenants need to do anything differently?',
    answer:
      'No. Tenants keep paying by M-Pesa or bank transfer exactly as they do today. Supported M-Pesa feeds can match automatically. You review forwarded bank receipts before they are recorded.',
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
  <div className={`text-sm font-semibold mb-2.5 ${className}`}>{children}</div>
);

/** Keep marketing content readable immediately, including after anchor jumps. */
const ContentBlock = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

const DASHBOARD_TABS = ['Overview', 'Properties', 'Tenants', 'Payments', 'Statements', 'Reports'] as const;

const StatTile = ({ label, value, sub, subClass = 'text-muted-foreground' }: { label: string; value: string; sub: string; subClass?: string }) => (
  <div className="min-w-0 rounded-lg border p-2.5">
    <span className="block text-xs text-muted-foreground truncate">{label}</span>
    <span className="block text-sm font-bold text-foreground mt-1 whitespace-nowrap">{value}</span>
    <span className={`text-xs ${subClass}`}>{sub}</span>
  </div>
);

const OverviewPanel = () => (
  <>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Good morning</h3>
        <p className="text-xs text-muted-foreground">Here's your rental portfolio</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success text-xs font-semibold px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Sample data
      </span>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <StatTile label="Collected" value="KES 284,500" sub="↑ 12.4%" subClass="text-success" />
      <StatTile label="Outstanding" value="KES 36,000" sub="3 tenants" subClass="text-warning" />
      <div className="col-span-2 sm:col-span-1">
        <StatTile label="Occupancy" value="94%" sub="47/50 units" />
      </div>
    </div>

    <div className="rounded-lg border p-3 mt-3">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>Monthly collections</span>
        <span className="text-success">KES 284.5K</span>
      </div>
      <div className="flex items-end gap-1.5 h-16 mt-3">
        {[30, 45, 55, 68, 62, 82].map((h, i) => (
          <div key={i} className={`flex-1 rounded-sm ${i === 5 ? 'bg-primary' : 'bg-primary/25'}`} style={{ height: `${h}%` }} />
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
  </>
);

const PropertiesPanel = () => (
  <>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">Properties</h3>
      <p className="text-xs text-muted-foreground">3 properties · 50 units</p>
    </div>
    <div className="space-y-2.5">
      {[
        { name: 'Kileleshwa Apartments', units: 12, occupancy: 100 },
        { name: 'Donholm Court', units: 20, occupancy: 90 },
        { name: 'Westlands Heights', units: 18, occupancy: 94 },
      ].map((p) => (
        <div key={p.name} className="rounded-lg border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground truncate">{p.name}</span>
            <span className="text-muted-foreground shrink-0 ml-2">{p.units} units</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success" style={{ width: `${p.occupancy}%` }} />
            </div>
            <span className="text-xs font-medium text-success shrink-0">{p.occupancy}%</span>
          </div>
        </div>
      ))}
    </div>
  </>
);

const TenantsPanel = () => {
  const statusClass: Record<string, string> = {
    Paid: 'bg-success/10 text-success',
    'Due soon': 'bg-warning/10 text-warning',
    Overdue: 'bg-destructive/10 text-destructive',
  };
  return (
    <>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Tenants</h3>
        <p className="text-xs text-muted-foreground">50 active tenants</p>
      </div>
      <div className="rounded-lg border overflow-hidden">
        {[
          { name: 'John Kamau', unit: '4B', status: 'Paid' },
          { name: 'Mary Wanjiku', unit: '2A', status: 'Paid' },
          { name: 'Grace Mumbi', unit: '1A', status: 'Due soon' },
          { name: 'Peter Otieno', unit: '7C', status: 'Overdue' },
        ].map((t) => (
          <div key={t.name} className="flex items-center justify-between px-3 py-2.5 text-xs border-b last:border-0">
            <div className="min-w-0">
              <span className="block font-medium text-foreground truncate">{t.name}</span>
              <span className="text-muted-foreground">Unit {t.unit}</span>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusClass[t.status]}`}>
              {t.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

const PaymentsPanel = () => (
  <>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">Payments</h3>
      <p className="text-xs text-muted-foreground">Today</p>
    </div>
    <div className="rounded-lg border overflow-hidden">
      {[
        { name: 'John Kamau · 4B', amount: 'KES 15,000', source: 'M-Pesa', time: '09:12' },
        { name: 'Mary Wanjiku · 2A', amount: 'KES 12,000', source: 'M-Pesa', time: '08:47' },
        { name: 'Grace Mumbi · 1A', amount: 'KES 9,500', source: 'Bank', time: 'Yesterday' },
      ].map((row) => (
        <div key={row.name} className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs border-b last:border-0">
          <div className="min-w-0">
            <span className="block text-muted-foreground truncate">{row.name}</span>
            <span className="text-xs text-muted-foreground/70">{row.source} · {row.time}</span>
          </div>
          <span className="font-semibold shrink-0">{row.amount}</span>
        </div>
      ))}
    </div>
  </>
);

const StatementsPanel = () => (
  <>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">Statement</h3>
      <p className="text-xs text-muted-foreground">John Kamau · Unit 4B</p>
    </div>
    <div className="rounded-lg border overflow-hidden">
      {[
        { date: 'Oct 1', desc: 'Rent due', amount: '-15,000' },
        { date: 'Oct 1', desc: 'M-Pesa payment', amount: '+15,000' },
        { date: 'Sep 1', desc: 'Rent due', amount: '-15,000' },
        { date: 'Sep 2', desc: 'M-Pesa payment', amount: '+15,000' },
      ].map((row, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs border-b last:border-0">
          <span className="text-muted-foreground w-12 shrink-0">{row.date}</span>
          <span className="text-foreground flex-1 truncate">{row.desc}</span>
          <span className={`font-semibold shrink-0 ${row.amount.startsWith('+') ? 'text-success' : 'text-foreground'}`}>
            {row.amount}
          </span>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between rounded-lg bg-success/5 border border-success/20 px-3 py-2.5 mt-2.5">
      <span className="text-xs font-semibold text-foreground">Balance</span>
      <span className="text-sm font-bold text-success">KES 0</span>
    </div>
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mt-3">
      <FileText className="h-3.5 w-3.5" /> Download PDF
    </div>
  </>
);

const ReportsPanel = () => (
  <>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">Monthly report</h3>
      <p className="text-xs text-muted-foreground">October 2026</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <StatTile label="Expected" value="KES 320K" sub="50 units" />
      <StatTile label="Collected" value="KES 284.5K" sub="89%" subClass="text-success" />
      <StatTile label="Outstanding" value="KES 36K" sub="3 tenants" subClass="text-warning" />
    </div>
    <div className="rounded-lg border p-3 mt-3 space-y-2.5">
      {[
        { name: 'Kileleshwa Apartments', pct: 100 },
        { name: 'Donholm Court', pct: 85 },
        { name: 'Westlands Heights', pct: 88 },
      ].map((p) => (
        <div key={p.name}>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="truncate">{p.name}</span>
            <span className="shrink-0">{p.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mt-3">
      <BarChart3 className="h-3.5 w-3.5" /> Export report
    </div>
  </>
);

const DASHBOARD_PANELS = [OverviewPanel, PropertiesPanel, TenantsPanel, PaymentsPanel, StatementsPanel, ReportsPanel];

/** Manual product preview. Panels stay put until the visitor chooses another. */
const DashboardMockup = () => {
  const [active, setActive] = useState(0);

  const ActivePanel = DASHBOARD_PANELS[active];

  return (
    <div className="rounded-3xl sm:rounded-2xl border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-2 text-xs text-muted-foreground">app.kodipap.com</span>
      </div>

      {/* Mobile tab strip — sidebar is desktop-only */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b">
        {DASHBOARD_TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={active === i}
            className={`min-h-11 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              active === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] min-h-[390px] sm:min-h-[450px]">
        <aside className="hidden sm:block bg-muted/40 border-r px-3 py-5 text-sm">
          <strong className="block mb-4 px-2 text-base">KODI PAP</strong>
          {DASHBOARD_TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className={`relative min-h-11 w-full text-left rounded-md px-2.5 py-2 mb-1 overflow-hidden transition-colors ${
                active === i ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </aside>
        <div className="p-4 sm:p-6">
          <div key={active} className="animate-fade-in">
            <ActivePanel />
          </div>
        </div>
      </div>
    </div>
  );
};

/** Visual shown beside the active "How it works" step. */
const STEP_VISUALS = [
  () => (
    <div className="rounded-xl border bg-card p-4 space-y-2.5 text-xs">
      {[
        ['Property', 'Kileleshwa Apartments'],
        ['Unit', '4B'],
        ['Monthly rent', 'KES 15,000'],
        ['Tenant', 'John Kamau'],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-foreground">{value}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 text-success text-xs font-semibold pt-1 border-t">
        <Check className="h-3.5 w-3.5" /> Saved
      </div>
    </div>
  ),
  () => (
    <div className="rounded-xl border bg-card p-4 text-xs space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Mail className="h-4 w-4 text-success" />
        Bank &amp; M-Pesa Email Forwarding
      </div>
      <p className="leading-relaxed text-foreground">
        Forward your M-Pesa and bank payment confirmations to your forwarding address:
      </p>
      <div className="p-2.5 rounded-lg bg-muted/50 border border-border font-mono text-xs break-all">
        yourname@payments.kodipap.com
      </div>
      <div className="flex items-center gap-1.5 text-success text-xs font-semibold pt-1 border-t">
        <ShieldCheck className="h-3.5 w-3.5" /> Money still goes straight to you
      </div>
    </div>
  ),
  () => (
    <div className="rounded-xl border bg-muted/30 p-4 text-xs">
      <div className="flex items-center gap-2 mb-2.5 text-success font-semibold">
        <Smartphone className="h-4 w-4" /> M-Pesa
      </div>
      <p className="leading-relaxed text-foreground">
        Confirmed. You have sent <strong>KES15,000.00</strong> to KODI PAP for account{' '}
        <strong>4B</strong> on 1/10/26 at 9:12 AM. New M-PESA balance is KES8,450.00.
      </p>
    </div>
  ),
  () => (
    <div className="rounded-xl border bg-card p-4 text-xs">
      <div className="flex items-center justify-between text-muted-foreground mb-3">
        <span>Incoming payment</span>
        <span className="font-mono text-xs">QFT7X2PL9K</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t">
        <div>
          <span className="block font-medium text-foreground">John Kamau · Unit 4B</span>
          <span className="text-muted-foreground">KES 15,000 via M-Pesa</span>
        </div>
        <span className="flex items-center gap-1 text-success font-semibold shrink-0 ml-2">
          <Check className="h-3.5 w-3.5" /> Matched
        </span>
      </div>
    </div>
  ),
  () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <StatTile label="Collected" value="KES 284.5K" sub="↑ 12.4%" subClass="text-success" />
      <StatTile label="Outstanding" value="KES 36K" sub="3 tenants" subClass="text-warning" />
      <StatTile label="Occupancy" value="94%" sub="47/50 units" />
    </div>
  ),
];

/** Readable, manually controlled setup walkthrough. */
const HowItWorksStepper = () => {
  const [active, setActive] = useState(0);
  const ActiveVisual = STEP_VISUALS[active];
  return (
    <div className="max-w-xl mx-auto">
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Setup steps">
        {STEPS.map((step, i) => (
          <button key={step.title} type="button" aria-label={step.title} aria-pressed={active === i}
            aria-controls="setup-step" onClick={() => setActive(i)}
            className={`min-h-11 rounded-lg border font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground'}`}>
            {i + 1}
          </button>
        ))}
      </div>
      <div id="setup-step" aria-live="polite" className="mt-5">
        <h3 className="text-lg font-semibold">{STEPS[active].title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{STEPS[active].description}</p>
        <div className="mt-5 min-w-0"><ActiveVisual /></div>
      </div>
    </div>
  );
};

const Landing = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const plans = PUBLIC_PLANS;
  return (
    <>
      <PageSeo title="KODI PAP — Rent Tracking for Kenyan Landlords"
        description="Track rent, balances and reminders. Match supported M-Pesa feeds and review forwarded bank receipts with KODI PAP." path="/" />
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-2 py-2">
            <Link to={ROUTES.LANDING} aria-label="KODI PAP home" className="shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
              <img src={kodiPapLogo} alt="KODI PAP" className="h-10 sm:h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-1 sm:gap-3">
              <Button asChild variant="ghost" className="min-h-11 px-3"><Link to={ROUTES.AUTH}>Log in</Link></Button>
              <Button asChild className="min-h-11 px-3 sm:px-5"><Link to={ROUTES.GET_STARTED}>Get started</Link></Button>
            </div>
          </div>
          <nav aria-label="Page sections" className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between sm:justify-start sm:gap-8 border-t">
            {[["#how", "How it works"], ["#pricing", "Pricing"], ["#features", "Features"]].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{label}</a>
            ))}
          </nav>
        </header>
        <main>
          <section aria-labelledby="landing-title" className="px-4 sm:px-8 py-7 sm:py-14 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-14">
              <div>
                <p className="text-sm font-semibold text-success">🇰🇪 Built for Kenyan landlords</p>
                <h1 id="landing-title" className="mt-4 text-[2.25rem] sm:text-6xl font-bold tracking-tight leading-[1.08] text-foreground">
                  Stop chasing rent.<br />Know who’s paid.
                </h1>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
                  Track rent, balances and reminders. Match supported M-Pesa feeds and review forwarded bank receipts in one place.
                </p>
                <p className="mt-4 flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-success shrink-0" />Rent stays in your M-Pesa or bank account.</p>
                <p className="mt-5 text-sm font-semibold">Plans from KES {PUBLIC_PLANS[0].price.toLocaleString()}/month</p>
                <div className="mt-3 flex items-center gap-3">
                  <Button asChild size="lg" className="min-h-11 flex-1 sm:flex-none"><Link to={ROUTES.GET_STARTED}>Get started</Link></Button>
                  <Button asChild size="lg" variant="outline" className="min-h-11 flex-1 sm:flex-none"><a href="#how">How it works</a></Button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-md">No payment now. Our team helps set up your account, usually within one business day.</p>
                <details className="lg:hidden mt-5 rounded-xl border bg-card">
                  <summary className="min-h-11 flex items-center px-4 cursor-pointer text-sm font-medium">Explore dashboard preview <ChevronRight className="ml-auto h-4 w-4" /></summary>
                  <div className="border-t"><DashboardMockup /></div>
                </details>
              </div>
              <div className="hidden lg:block rounded-3xl p-5 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(hsl(var(--background)/0.4), hsl(var(--background)/0.8)), url("${heroImagePipelineStreet}")` }}>
                <DashboardMockup />
              </div>
            </div>
          </section>
          <section id="how" className="scroll-mt-32 px-4 sm:px-8 py-10 sm:py-20 border-t max-w-5xl mx-auto">
            <div className="mb-6 sm:mb-10 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">From payment to a clear record.</h2>
              <p className="mt-3 text-muted-foreground">Tenants keep paying normally. You stay in control of their records.</p>
            </div>
            <HowItWorksStepper />
          </section>
        {/* Pricing */}
        <section id="pricing" className="scroll-mt-32 px-4 sm:px-8 py-10 sm:py-20 bg-muted/40">
          <ContentBlock className="text-center mb-6 sm:mb-10 max-w-xl mx-auto">
            <Kicker>Simple pricing</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Fixed plans. Clear limits.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pay a fixed plan total for the capacity you need. No per-transaction fees on your rent.
            </p>
          </ContentBlock>

          <ContentBlock className="flex items-center justify-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              aria-pressed={billing === 'monthly'}
              className={`min-h-11 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              aria-pressed={billing === 'annual'}
              className={`min-h-11 rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                billing === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className={`rounded-full text-xs font-bold px-1.5 py-0.5 ${billing === 'annual' ? 'bg-primary-foreground/20' : 'bg-success/10 text-success'}`}>
                Save {ANNUAL_DISCOUNT * 100}%
              </span>
            </button>
          </ContentBlock>

          <p className="mb-7 text-center text-sm text-muted-foreground">
            {billing === 'annual' ? 'Annual totals are paid upfront for 12 months.' : 'Monthly totals apply even if your portfolio is below the plan limit.'}
          </p>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {plans.map((plan) => {
              const months = billing === 'annual' ? 12 : 1;
              const total = calcPrepayTotal(plan.price, months);
              const effectiveMonthly = billing === 'annual' ? Math.round(total / 12) : plan.price;
              return (
                  <ContentBlock key={plan.name}>
                    <div
                      className={`relative h-full rounded-2xl border bg-card p-5 sm:p-6 flex flex-col ${
                        plan.highlighted ? 'border-primary shadow-lg sm:scale-105' : ''
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                          Most Popular
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                      <div className="mt-3">
                        <span className="text-3xl font-bold tracking-tight text-foreground">
                          KES {(billing === 'annual' ? total : plan.price).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground"> / {billing === 'annual' ? 'year' : 'month'}</span>
                      </div>
                      {billing === 'annual' ? (
                        <p className="text-xs text-success font-medium">KES {effectiveMonthly.toLocaleString()}/month</p>
                      ) : (
                        <div className="mt-1 text-xs font-medium text-primary">
                          Fixed monthly total · up to {plan.maxTenants} tenants
                        </div>
                      )}
                      <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Up to {plan.maxProperties} {plan.maxProperties === 1 ? 'property' : 'properties'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Up to {plan.maxTenants} tenants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{plan.smsTokensIncluded} SMS tokens included</span>
                        </div>
                      </div>
                      <ul className="hidden sm:block mt-5 space-y-2.5 flex-1 pt-4 border-t">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <details className="sm:hidden mt-3 border-t">
                        <summary className="min-h-11 flex items-center cursor-pointer text-sm font-medium">See plan features <ChevronRight className="ml-auto h-4 w-4" /></summary>
                        <ul className="pb-3 space-y-2 text-sm text-muted-foreground">
                          {plan.features.map(feature => <li key={feature} className="flex gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />{feature}</li>)}
                        </ul>
                      </details>
                      <Button
                        asChild
                        className="mt-3 sm:mt-6 min-h-11 w-full"
                        variant={plan.highlighted ? 'default' : 'outline'}
                      >
                        <Link to={`${ROUTES.GET_STARTED}?plan=${encodeURIComponent(plan.name)}&billing=${billing}`}>Choose {plan.name}</Link>
                      </Button>
                    </div>
                  </ContentBlock>
              );
            })}

            <ContentBlock>
              <div className="h-full rounded-3xl sm:rounded-2xl border border-dashed bg-card/50 p-6 flex flex-col">
                <h3 className="font-semibold text-foreground">{ENTERPRISE_PLAN.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{ENTERPRISE_PLAN.description}</p>
                <div className="mt-3">
                  <span className="text-2xl font-bold tracking-tight text-foreground">Custom</span>
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  101+ tenants · volume pricing
                </div>
                <ul className="mt-5 space-y-2.5 flex-1 pt-4 border-t">
                  {ENTERPRISE_PLAN.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-3 sm:mt-6 min-h-11 w-full">
                  <Link to={ROUTES.CONTACT}>Get a quote</Link>
                </Button>
              </div>
            </ContentBlock>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-32 px-4 sm:px-8 py-10 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <ContentBlock className="text-center mb-6 sm:mb-10 max-w-xl mx-auto">
              <Kicker>Everything you need</Kicker>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Run your rentals without the busywork.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Focused tools for landlords who want less admin and more control.
              </p>
            </ContentBlock>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-6">
              {FEATURES.map((feature) => (
                <ContentBlock key={feature.title}>
                  <div className="h-full flex items-start gap-4 border-b py-5 sm:block sm:rounded-2xl sm:border sm:bg-card sm:p-5">
                    <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div><h3 className="sm:mt-3.5 font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p></div>
                  </div>
                </ContentBlock>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-32 px-4 sm:px-8 py-10 sm:py-20">
          <ContentBlock className="text-center mb-6 sm:mb-10 max-w-xl mx-auto">
            <Kicker>Questions</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Frequently asked questions.
            </h2>
          </ContentBlock>
          <ContentBlock className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-left text-foreground">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ContentBlock>
        </section>

        {/* Final CTA */}
        <section className="px-4 sm:px-8 py-10 sm:py-20 bg-gradient-to-br from-foreground to-primary">
          <ContentBlock className="max-w-3xl mx-auto text-center">
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
          </ContentBlock>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-8 py-8 max-w-5xl mx-auto text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} KODI PAP. Built for Kenyan landlords. 🇰🇪</span>
            <div className="flex items-center gap-2 sm:gap-5">
              <a href="#features" className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Features</a>
              <a href="#pricing" className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Pricing</a>
              <Link to={ROUTES.AUTH} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Log in</Link>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-0">
            <Link to={ROUTES.PRIVACY_POLICY} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</Link>
            <Link to={ROUTES.TERMS_OF_USE} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms of Use</Link>
            <Link to={ROUTES.COOKIE_POLICY} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cookie Policy</Link>
            <Link to={ROUTES.REFUND_CANCELLATION} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Refund & Cancellation</Link>
            <Link to={ROUTES.CONTACT} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Contact & Support</Link>
          </div>
        </footer>

        </main>
      </div>
    </>
  );
};

export default Landing;
