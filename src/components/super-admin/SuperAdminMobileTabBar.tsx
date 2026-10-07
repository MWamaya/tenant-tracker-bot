import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Building,
  MoreHorizontal,
  UserPlus,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/routes';

const tabs = [
  { name: 'Dashboard', href: ROUTES.SUPER_ADMIN_ROOT, icon: LayoutDashboard },
  { name: 'Landlords', href: ROUTES.SUPER_ADMIN_LANDLORDS, icon: Users },
  { name: 'Payments', href: ROUTES.SUPER_ADMIN_PAYMENTS, icon: DollarSign },
  { name: 'Properties', href: ROUTES.SUPER_ADMIN_PROPERTIES, icon: Building },
];

const moreLinks = [
  { name: 'Onboarding Requests', href: ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS, icon: UserPlus },
  { name: 'Audit Logs', href: ROUTES.SUPER_ADMIN_AUDIT_LOGS, icon: FileText },
  { name: 'Settings', href: ROUTES.SUPER_ADMIN_SETTINGS, icon: Settings },
];

const SuperAdminMobileTabBar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreLinks.some((link) => location.pathname === link.href);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] px-4 pointer-events-none">
        <div className="flex items-center gap-1 rounded-full bg-[#0F172A]/70 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 px-2 py-2 pointer-events-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-[#2DD4BF] text-[#0F172A]' : 'text-slate-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isMoreActive ? 'bg-[#2DD4BF] text-[#0F172A]' : 'text-slate-300'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 bg-[#0F172A] border-white/10">
          <div className="py-2">
            {moreLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3 ${
                    isActive ? 'text-[#2DD4BF] font-medium' : 'text-slate-200'
                  }`}
                >
                  <link.icon className="h-5 w-5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-6 py-3 w-full text-left text-red-400"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SuperAdminMobileTabBar;
