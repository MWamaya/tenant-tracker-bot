import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  MoreHorizontal,
  Home,
  ListChecks,
  FileText,
  Mail,
  Settings,
  LogOut,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useReconciliation } from '@/hooks/useReconciliation';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/routes';

const tabs = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'Properties', href: ROUTES.PROPERTIES, icon: Building2 },
  { name: 'Tenants', href: ROUTES.TENANTS, icon: Users },
  { name: 'Payments', href: ROUTES.PAYMENTS, icon: CreditCard },
];

const moreLinks = [
  { name: 'Houses', href: ROUTES.HOUSES, icon: Home },
  { name: 'Needs Review', href: ROUTES.RECONCILIATION, icon: ListChecks },
  { name: 'Reports', href: ROUTES.REPORTS, icon: FileText },
  { name: 'Email Logs', href: ROUTES.EMAIL_LOGS, icon: Mail },
  { name: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
];

export const MobileTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { items: reconciliationItems } = useReconciliation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate(ROUTES.AUTH);
  };

  const isMoreActive = moreLinks.some((link) => location.pathname === link.href);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] px-4 pointer-events-none">
        <div className="flex items-center gap-1 rounded-full bg-sidebar/70 backdrop-blur-xl border border-sidebar-border/60 shadow-lg shadow-black/10 px-2 py-2 pointer-events-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href;
            return (
              <NavLink
                key={tab.name}
                to={tab.href}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/70'
                }`}
              >
                <tab.icon className="h-5 w-5" />
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isMoreActive
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground/70'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            {reconciliationItems.length > 0 && (
              <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-medium bg-destructive text-destructive-foreground">
                {reconciliationItems.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <div className="py-2">
            {moreLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <NavLink
                  key={link.name}
                  to={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3 ${
                    isActive ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="flex-1">{link.name}</span>
                  {link.href === ROUTES.RECONCILIATION && reconciliationItems.length > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-xs font-medium bg-destructive text-destructive-foreground">
                      {reconciliationItems.length}
                    </span>
                  )}
                </NavLink>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-3 w-full text-left text-destructive/80"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
