import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronRight, CircleCheck, Mail, Webhook, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useFailedEmailLogsCount,
  useUnprocessedWebhooksCount,
  type PlatformStats,
} from '@/hooks/useSuperAdminData';
import { ADMIN_CARD, ADMIN_SURFACE } from '@/lib/adminStatusColors';
import { ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface FailedEmailRow {
  id: string;
  landlord_id: string;
  raw_message: string;
  error_message: string | null;
  created_at: string;
}

const useFailedEmailLogsList = (open: boolean) =>
  useQuery({
    queryKey: ['needs-attention-failed-email-logs-list'],
    queryFn: async (): Promise<FailedEmailRow[]> => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, landlord_id, raw_message, error_message, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

interface UnprocessedWebhookRow {
  id: string;
  webhook_type: string;
  endpoint: string;
  error_message: string | null;
  response_status: number | null;
  created_at: string;
}

const useUnprocessedWebhooksList = (open: boolean) =>
  useQuery({
    queryKey: ['needs-attention-unprocessed-webhooks-list'],
    queryFn: async (): Promise<UnprocessedWebhookRow[]> => {
      const { data, error } = await supabase
        .from('webhooks_log')
        .select('id, webhook_type, endpoint, error_message, response_status, created_at')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

const NeedsAttentionCard = ({ stats }: { stats: PlatformStats | undefined }) => {
  const navigate = useNavigate();
  const { data: failedEmailCount } = useFailedEmailLogsCount();
  const { data: unprocessedWebhookCount } = useUnprocessedWebhooksCount();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const { data: failedEmails, isLoading: failedEmailsLoading } =
    useFailedEmailLogsList(emailDialogOpen);
  const { data: unprocessedWebhooks, isLoading: unprocessedWebhooksLoading } =
    useUnprocessedWebhooksList(webhookDialogOpen);

  const items = [
    {
      key: 'unmatched-payments',
      count: stats?.unmatchedPayments ?? 0,
      label: 'unmatched payment(s) — review payment matching',
      onClick: () => navigate(`${ROUTES.SUPER_ADMIN_PAYMENTS}?tab=unmatched`),
    },
    {
      key: 'failed-emails',
      count: failedEmailCount ?? 0,
      label: 'bank email(s) failed to parse',
      onClick: () => setEmailDialogOpen(true),
    },
    {
      key: 'unprocessed-webhooks',
      count: unprocessedWebhookCount ?? 0,
      label: 'webhook callback(s) never finished processing',
      onClick: () => setWebhookDialogOpen(true),
    },
    {
      key: 'expiring-subscriptions',
      count: stats?.expiringSubscriptions ?? 0,
      label: 'subscription(s) expiring within 7 days',
      onClick: () => navigate(ROUTES.SUPER_ADMIN_LANDLORDS),
    },
  ].filter((item) => item.count > 0);

  return (
    <>
      <Card className={ADMIN_CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">
            Needs Attention
          </CardTitle>
          <CardDescription className="text-[#64748B]">
            Platform issues an admin should act on
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex items-center gap-2 text-[#0F766E] py-2">
              <CircleCheck className="h-4 w-4" />
              <span className="text-sm font-medium">All clear</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'w-full flex items-center justify-between p-3 text-left',
                    ADMIN_SURFACE,
                    'hover:bg-[#F1F5F9] transition-colors duration-150'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-[#0F172A]">
                      <span className="font-semibold">{item.count}</span> {item.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#64748B] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Failed bank-email parses
            </DialogTitle>
            <DialogDescription>
              Most recent 50 emails that failed automatic parsing
            </DialogDescription>
          </DialogHeader>
          {failedEmailsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !failedEmails || failedEmails.length === 0 ? (
            <p className="text-sm text-[#64748B] py-4">No failed parses.</p>
          ) : (
            <div className="space-y-2">
              {failedEmails.map((row) => (
                <div key={row.id} className={cn('p-3', ADMIN_SURFACE)}>
                  <p className="text-xs text-[#64748B]">{formatDateTime(row.created_at)}</p>
                  <p className="text-sm text-[#0F172A] mt-1 font-mono break-all">
                    {row.raw_message.slice(0, 160)}
                  </p>
                  {row.error_message && (
                    <p className="text-xs text-destructive mt-1">{row.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Unprocessed webhook callbacks
            </DialogTitle>
            <DialogDescription>
              Most recent 50 webhook deliveries still marked unprocessed
            </DialogDescription>
          </DialogHeader>
          {unprocessedWebhooksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !unprocessedWebhooks || unprocessedWebhooks.length === 0 ? (
            <p className="text-sm text-[#64748B] py-4">No unprocessed webhooks.</p>
          ) : (
            <div className="space-y-2">
              {unprocessedWebhooks.map((row) => (
                <div key={row.id} className={cn('p-3', ADMIN_SURFACE)}>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(row.created_at)}
                  </div>
                  <p className="text-sm text-[#0F172A] mt-1">
                    {row.webhook_type} → {row.endpoint}
                    {row.response_status ? ` (HTTP ${row.response_status})` : ''}
                  </p>
                  {row.error_message && (
                    <p className="text-xs text-destructive mt-1">{row.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NeedsAttentionCard;
