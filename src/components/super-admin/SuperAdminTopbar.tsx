import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  usePlatformStats,
  useFailedEmailLogsCount,
  useUnprocessedWebhooksCount,
} from '@/hooks/useSuperAdminData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, ChevronRight, LogOut, Settings, CircleCheck } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const SuperAdminTopbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: stats } = usePlatformStats();
  const { data: failedEmailCount } = useFailedEmailLogsCount();
  const { data: unprocessedWebhookCount } = useUnprocessedWebhooksCount();

  const items = [
    {
      key: 'failed-emails',
      count: failedEmailCount ?? 0,
      label: 'failed bank-email parse(s)',
      onClick: () => navigate(ROUTES.SUPER_ADMIN_AUDIT_LOGS),
    },
    {
      key: 'unprocessed-webhooks',
      count: unprocessedWebhookCount ?? 0,
      label: 'unprocessed webhook(s)',
      onClick: () => navigate(ROUTES.SUPER_ADMIN_AUDIT_LOGS),
    },
    {
      key: 'expiring-subscriptions',
      count: stats?.expiringSubscriptions ?? 0,
      label: 'subscription(s) expiring within 7 days',
      onClick: () => navigate(ROUTES.SUPER_ADMIN_LANDLORDS),
    },
  ].filter((item) => item.count > 0);

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  const initial = (user?.user_metadata?.full_name as string | undefined)?.[0] || user?.email?.[0] || 'A';

  return (
    <header className="hidden lg:flex items-center justify-end gap-2 h-14 px-6 border-b border-[#E2E8F0] bg-white sticky top-0 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-[#64748B] hover:text-[#0F172A]">
            <Bell className="h-5 w-5" />
            {totalCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">
                {totalCount > 9 ? '9+' : totalCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Needs attention</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-[#0F766E]">
              <CircleCheck className="h-4 w-4" />
              All clear
            </div>
          ) : (
            items.map((item) => (
              <DropdownMenuItem
                key={item.key}
                onClick={item.onClick}
                className={cn('flex items-center justify-between gap-2 cursor-pointer')}
              >
                <span className="text-sm">
                  <span className="font-semibold">{item.count}</span> {item.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[#F1F5F9] transition-colors duration-150">
            <div className="w-8 h-8 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
              <span className="text-[#0F766E] font-semibold text-sm uppercase">{initial}</span>
            </div>
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
    </header>
  );
};

export default SuperAdminTopbar;
