import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/lib/routes';

interface SuperAdminMobileTopBarProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const SuperAdminMobileTopBar = ({ title, showBackButton, onBack }: SuperAdminMobileTopBarProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const initial = (user?.user_metadata?.full_name as string | undefined)?.[0] || user?.email?.[0] || 'A';

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-[#0F172A] border-b border-white/10">
      <div className="flex h-14 items-center gap-3 px-4">
        {showBackButton ? (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            className="text-white -ml-1 p-1"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(ROUTES.SUPER_ADMIN_ROOT)}
            className="flex items-center gap-2"
          >
            <Shield className="h-6 w-6 text-[#2DD4BF]" />
          </button>
        )}
        <span className="text-base font-semibold text-white truncate flex-1">{title}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#CCFBF1]/10 border border-[#0F766E]/30 shrink-0">
              <span className="text-[#2DD4BF] font-semibold text-sm uppercase">{initial}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-[#0F172A] truncate">
                {(user?.user_metadata?.full_name as string | undefined) || 'Super Admin'}
              </p>
              <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`${ROUTES.SUPER_ADMIN_SETTINGS}?tab=profile`)} className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SUPER_ADMIN_SETTINGS)} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
