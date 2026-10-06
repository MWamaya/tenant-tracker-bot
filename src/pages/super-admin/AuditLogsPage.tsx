import { useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useAuditLogs, useLandlords } from '@/hooks/useSuperAdminData';
import type { AuditLog } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dates';
import { downloadCsv, rowsToCsv } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const getActionColor = (action: string) => {
  if (action.includes('CREATE') || action.includes('ASSIGN') || action.includes('ALLOCATE')) {
    return STATUS_BADGE_CLASSES.success;
  }
  if (action.includes('UPDATE') || action.includes('IMPERSONATION')) {
    return STATUS_BADGE_CLASSES.info;
  }
  if (action.includes('DELETE') || action.includes('SUSPEND') || action.includes('REVOKE')) {
    return STATUS_BADGE_CLASSES.destructive;
  }
  return STATUS_BADGE_CLASSES.neutral;
};

// Turns a log row into a plain sentence instead of a raw JSON dump — every
// other admin-facing surface in this app uses human phrasing, this is the
// only one that didn't.
const describeAuditLog = (log: AuditLog, landlordNameById: Map<string, string>): string => {
  const v = (log.new_values ?? {}) as Record<string, unknown>;
  // entity_id is the landlord's id for most of these actions (profile,
  // sms_tokens) — only ASSIGN_SUBSCRIPTION's entity_id points at the
  // subscription row instead, where new_values.landlord_id is used.
  const landlordName =
    (log.entity_id && landlordNameById.get(log.entity_id)) ||
    (typeof v.landlord_id === 'string' && landlordNameById.get(v.landlord_id)) ||
    null;

  switch (log.action) {
    case 'CREATE_LANDLORD':
      return `Created landlord account for ${v.full_name || 'Unknown'} (${v.email || 'no email'})`;
    case 'CREATE_SUPER_ADMIN':
      return `Invited ${v.full_name || 'Unknown'} (${v.email || 'no email'}) as a super admin`;
    case 'REVOKE_SUPER_ADMIN':
      return 'Revoked a super admin’s access';
    case 'UPDATE_LANDLORD_STATUS':
      return `Set ${landlordName || 'a landlord'}’s account status to ${v.account_status || 'unknown'}`;
    case 'UPDATE_INBOUND_EMAIL':
      return `Updated ${landlordName || 'a landlord'}’s inbound email to ${v.inbound_email || 'unknown'}`;
    case 'ALLOCATE_SMS_TOKENS': {
      const amount = Number(v.amount) || 0;
      return `${amount >= 0 ? 'Allocated' : 'Deducted'} ${Math.abs(amount)} SMS token(s) ${amount >= 0 ? 'to' : 'from'} ${landlordName || 'a landlord'}`;
    }
    case 'ASSIGN_SUBSCRIPTION':
      return `Assigned the ${v.plan_name || 'Unknown'} plan to ${landlordName || 'a landlord'}`;
    case 'UPDATE_ONBOARDING_REQUEST_STATUS':
      return `Marked an onboarding request as ${v.status || 'unknown'}`;
    case 'UPDATE_SUBSCRIPTION_PLAN':
      return `Updated a subscription plan (price: KES ${v.price ?? '?'}, active: ${v.is_active ? 'yes' : 'no'})`;
    case 'UPDATE_SYSTEM_SETTING': {
      const [key, value] = Object.entries(v)[0] ?? [];
      return `Changed setting "${String(key ?? 'unknown').replace(/_/g, ' ')}" to ${String(value)}`;
    }
    case 'START_IMPERSONATION':
      return `Started ${v.view_only ? 'read-only ' : ''}viewing as ${v.landlord_name || 'a landlord'}`;
    case 'STOP_IMPERSONATION':
      return `Stopped viewing as ${v.landlord_name || 'a landlord'}`;
    default:
      return `${log.action.replace(/_/g, ' ')} on ${log.entity_type}`;
  }
};

const AuditLogsPage = () => {
  const { data: pages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuditLogs();
  const { data: landlords } = useLandlords();
  const [searchQuery, setSearchQuery] = useState('');

  const landlordNameById = new Map(
    (landlords || []).map((l) => [l.id, l.full_name || l.company_name || 'Unknown landlord'])
  );

  const logs = pages?.pages.flat() || [];

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const description = describeAuditLog(log, landlordNameById).toLowerCase();
    return (
      log.admin_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      description.includes(q)
    );
  });

  const handleExportCsv = () => {
    downloadCsv(
      'kodipap-audit-logs.csv',
      rowsToCsv(filteredLogs, [
        { header: 'Action', accessor: (l) => l.action },
        { header: 'Description', accessor: (l) => describeAuditLog(l, landlordNameById) },
        { header: 'Admin', accessor: (l) => l.admin_name },
        { header: 'Entity Type', accessor: (l) => l.entity_type },
        { header: 'Date', accessor: (l) => l.created_at },
      ])
    );
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Audit Logs</h1>
          <p className="text-[#64748B]">Track all Super Admin actions on the platform</p>
        </div>

        {/* Search */}
        <Card className={ADMIN_CARD}>
          <CardContent className="pt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
              <Input
                placeholder="Search by admin, action, or entity..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className={cn('gap-2 border-[#E2E8F0] text-[#1E3A5F] shrink-0', ADMIN_SURFACE_HOVER)}
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription className="text-[#64748B]">
              {filteredLogs.length} action{filteredLogs.length === 1 ? '' : 's'} shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-[#E2E8F0]" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-[#CBD5E1] mx-auto mb-4" />
                <p className="text-[#64748B]">
                  {searchQuery ? 'No actions match your search' : 'No audit logs recorded yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4', ADMIN_SURFACE, ADMIN_SURFACE_HOVER)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-[#0F766E] mt-2 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={getActionColor(log.action)}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm text-[#64748B]">by {log.admin_name}</span>
                          </div>
                          <p className="text-sm text-[#0F172A]">{describeAuditLog(log, landlordNameById)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-[#0F172A]">{formatDate(log.created_at)}</p>
                        <p className="text-xs text-[#64748B]">{format(new Date(log.created_at), 'HH:mm:ss')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasNextPage && (
                  <Button
                    variant="outline"
                    className={cn('w-full mt-4 border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AuditLogsPage;
