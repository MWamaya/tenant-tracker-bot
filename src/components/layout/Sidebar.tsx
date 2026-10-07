import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  CreditCard,
  FileText,
  Settings,
  Mail,
  LogOut,
  Building2,
  ListChecks
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReconciliation } from '@/hooks/useReconciliation';
import { toast } from 'sonner';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';
import { ROUTES } from '@/lib/routes';

const navigation = [
  { name: 'Landlord Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'Properties', href: ROUTES.PROPERTIES, icon: Building2 },
  { name: 'Houses', href: ROUTES.HOUSES, icon: Home },
  { name: 'Tenants', href: ROUTES.TENANTS, icon: Users },
  { name: 'Payments', href: ROUTES.PAYMENTS, icon: CreditCard },
  { name: 'Needs Review', href: ROUTES.RECONCILIATION, icon: ListChecks },
  { name: 'Reports', href: ROUTES.REPORTS, icon: FileText },
  { name: 'Email Logs', href: ROUTES.EMAIL_LOGS, icon: Mail },
];

const SidebarContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { items: reconciliationItems } = useReconciliation();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate(ROUTES.AUTH);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <NavLink
        to={ROUTES.DASHBOARD}
        className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6 hover:bg-sidebar-accent/50 transition-colors"
      >
        <img src={kodiPapLogo} alt="Kodi Pap Logo" className="h-10 w-auto" />
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">KODI PAP</h1>
          <p className="text-xs text-sidebar-foreground/60">Collection Manager</p>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {item.href === ROUTES.RECONCILIATION && reconciliationItems.length > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-xs font-medium bg-destructive text-destructive-foreground">
                  {reconciliationItems.length}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to={ROUTES.SETTINGS}
          className={`sidebar-link ${location.pathname === ROUTES.SETTINGS ? 'sidebar-link-active' : ''}`}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-left text-destructive/80 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  return (
    <aside className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <SidebarContent />
    </aside>
  );
};
