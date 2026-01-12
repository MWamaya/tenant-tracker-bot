import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useAuditLogs } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';

const AuditLogsPage = () => {
  const { data: logs, isLoading } = useAuditLogs(100);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ASSIGN') || action.includes('ALLOCATE')) {
      return 'border-green-500 text-green-400';
    }
    if (action.includes('UPDATE')) {
      return 'border-blue-500 text-blue-400';
    }
    if (action.includes('DELETE') || action.includes('SUSPEND')) {
      return 'border-red-500 text-red-400';
    }
    return 'border-slate-500 text-slate-400';
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400">Track all Super Admin actions on the platform</p>
        </div>

        {/* Logs List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription className="text-slate-400">
              Showing the last 100 admin actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-700" />
                ))}
              </div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No audit logs recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs?.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-slate-900/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-slate-400">on</span>
                          <span className="text-sm text-slate-300">{log.entity_type}</span>
                        </div>
                        {log.new_values && (
                          <p className="text-xs text-slate-500 mt-1 font-mono">
                            {JSON.stringify(log.new_values).substring(0, 100)}
                            {JSON.stringify(log.new_values).length > 100 && '...'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-300">
                        {format(new Date(log.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-slate-500">
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
