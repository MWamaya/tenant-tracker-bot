import { useState } from 'react';
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
  Menu,
  X,
  Building2
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';

const navigation = [
  { name: 'Landlord Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Houses', href: '/houses', icon: Home },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Email Logs', href: '/email-logs', icon: Mail },
];

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={kodiPapLogo} alt="Kodi Pap Logo" className="h-10 w-auto" />
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">KODI PAP</h1>
          <p className="text-xs text-sidebar-foreground/60">Collection Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={`sidebar-link ${location.pathname === '/settings' ? 'sidebar-link-active' : ''}`}
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={kodiPapLogo} alt="Kodi Pap Logo" className="h-8 w-auto" />
            <span className="text-base font-bold text-sidebar-foreground tracking-tight">KODI PAP</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
        <SidebarContent />
      </aside>
    </>
  );
};