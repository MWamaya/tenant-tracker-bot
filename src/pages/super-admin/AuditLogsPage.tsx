import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useAuditLogs } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dates';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const AuditLogsPage = () => {
  const { data: logs, isLoading } = useAuditLogs(100);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ASSIGN') || action.includes('ALLOCATE')) {
      return STATUS_BADGE_CLASSES.success;
    }
    if (action.includes('UPDATE')) {
      return STATUS_BADGE_CLASSES.info;
    }
    if (action.includes('DELETE') || action.includes('SUSPEND')) {
      return STATUS_BADGE_CLASSES.destructive;
    }
    return STATUS_BADGE_CLASSES.neutral;
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Audit Logs</h1>
          <p className="text-[#64748B]">Track all Super Admin actions on the platform</p>
        </div>

        {/* Logs List */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription className="text-[#64748B]">
              Showing the last 100 admin actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-[#E2E8F0]" />
                ))}
              </div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-[#CBD5E1] mx-auto mb-4" />
                <p className="text-[#64748B]">No audit logs recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs?.map((log) => (
                  <div
                    key={log.id}
                    className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4", ADMIN_SURFACE, "hover:bg-[#E2E8F0] transition-colors duration-150")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#0F766E] mt-2" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-[#64748B]">on</span>
                          <span className="text-sm text-[#0F172A]">{log.entity_type}</span>
                          <span className="text-sm text-[#64748B]">by {log.admin_name}</span>
                        </div>
                        {log.new_values && (
                          <p className="text-xs text-[#64748B] mt-1 font-mono">
                            {JSON.stringify(log.new_values).substring(0, 100)}
                            {JSON.stringify(log.new_values).length > 100 && '...'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#0F172A]">
                        {formatDate(log.created_at)}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AuditLogsPage;
