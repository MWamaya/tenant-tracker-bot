import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  LogOut,
  Shield,
  Building,
  DollarSign,
  UserPlus,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import SuperAdminTopbar from './SuperAdminTopbar';
import { SuperAdminMobileTopBar } from './SuperAdminMobileTopBar';
import SuperAdminMobileTabBar from './SuperAdminMobileTabBar';

interface SuperAdminLayoutProps {
  children: ReactNode;
  mobileTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const titleByPath: Record<string, string> = {
  [ROUTES.SUPER_ADMIN_ROOT]: 'Dashboard',
  [ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS]: 'Onboarding Requests',
  [ROUTES.SUPER_ADMIN_LANDLORDS]: 'Landlords',
  [ROUTES.SUPER_ADMIN_PAYMENTS]: 'Payments',
  [ROUTES.SUPER_ADMIN_PROPERTIES]: 'Properties',
  [ROUTES.SUPER_ADMIN_AUDIT_LOGS]: 'Audit Logs',
  [ROUTES.SUPER_ADMIN_SETTINGS]: 'Settings',
};

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: ROUTES.SUPER_ADMIN_ROOT },
  { icon: UserPlus, label: 'Onboarding Requests', path: ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS },
  { icon: Users, label: 'Landlords', path: ROUTES.SUPER_ADMIN_LANDLORDS },
  { icon: DollarSign, label: 'Payments', path: ROUTES.SUPER_ADMIN_PAYMENTS },
  { icon: Building, label: 'Properties', path: ROUTES.SUPER_ADMIN_PROPERTIES },
  { icon: FileText, label: 'Audit Logs', path: ROUTES.SUPER_ADMIN_AUDIT_LOGS },
  { icon: Settings, label: 'Settings', path: ROUTES.SUPER_ADMIN_SETTINGS },
];

const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-full bg-[#0F172A]">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link to={ROUTES.SUPER_ADMIN_ROOT} className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 rounded-xl bg-[#0F766E]/20 border border-[#0F766E]/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#2DD4BF]" />
          </div>
          <div>
            <h1 className="font-semibold tracking-tight text-white">Kodipap</h1>
            <p className="text-xs text-slate-400">Super Admin</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-[#CCFBF1]/10 text-white'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#2DD4BF]" />
                )}
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive ? 'text-[#2DD4BF]' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px] mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

const SuperAdminLayout = ({ children, mobileTitle, showBackButton, onBack }: SuperAdminLayoutProps) => {
  const location = useLocation();
  const title = mobileTitle ?? titleByPath[location.pathname] ?? 'Super Admin';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SuperAdminMobileTopBar title={title} showBackButton={showBackButton} onBack={onBack} />

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col bg-[#0F172A] border-r border-white/10">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          <SuperAdminTopbar />
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <SuperAdminMobileTabBar />
    </div>
  );
};

export default SuperAdminLayout;
