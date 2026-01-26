import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useEmailLogs, parsePaymentMessage } from '@/hooks/useEmailLogs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, RefreshCw, CheckCircle, XCircle, AlertCircle, Mail, Zap, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EmailLog } from '@/hooks/useEmailLogs';

const EmailLogs = () => {
  const { emailLogs, isLoading, addEmailLog, updateEmailLog, processEmailLog, refetch } = useEmailLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [parsedResult, setParsedResult] = useState<ReturnType<typeof parsePaymentMessage> | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<EmailLog | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [editPreviewResult, setEditPreviewResult] = useState<ReturnType<typeof parsePaymentMessage> | null>(null);

  const filteredLogs = emailLogs.filter(log =>
    log.raw_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTestParse = async (addToLog: boolean = false) => {
    if (testMessage.trim()) {
      const result = parsePaymentMessage(testMessage);
      setParsedResult(result);
      
      if (addToLog) {
        await addEmailLog.mutateAsync({ raw_message: testMessage });
        setTestMessage('');
        setParsedResult(null);
      }
    }
  };

  const handleEditLog = (log: EmailLog) => {
    setEditingLog(log);
    setEditedMessage(log.raw_message);
    setEditPreviewResult(null);
    setEditDialogOpen(true);
  };

  const handlePreviewParse = () => {
    if (editedMessage.trim()) {
      const result = parsePaymentMessage(editedMessage);
      setEditPreviewResult(result);
    }
  };

  const handleSaveAndSync = async () => {
    if (!editingLog || !editedMessage.trim()) return;

    const parsed = parsePaymentMessage(editedMessage);

    await updateEmailLog.mutateAsync({
      id: editingLog.id,
      data: {
        raw_message: editedMessage,
        parsed_amount: parsed.amount,
        parsed_house_no: parsed.houseNo,
        parsed_tenant_name: parsed.tenantName,
        parsed_mpesa_ref: parsed.mpesaRef,
        parsed_date: parsed.paymentDate,
        status: parsed.isValid ? 'pending' : 'failed',
        error_message: parsed.isValid ? null : 'Could not parse required fields from message',
      },
    });

    setEditDialogOpen(false);
    setEditingLog(null);
    setEditedMessage('');
    setEditPreviewResult(null);
  };

  const handleProcessPayment = async (log: EmailLog) => {
    await processEmailLog.mutateAsync(log);
  };

  const getStatusIcon = (status: EmailLog['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: EmailLog['status']) => {
    const variants = {
      processed: 'bg-success/10 text-success border-success/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
      pending: 'bg-warning/10 text-warning border-warning/20',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status]}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
            <p className="text-muted-foreground mt-1">
              Monitor automated email parsing and payment detection
            </p>
          </div>
          <Button className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Emails</p>
                <p className="text-xl font-bold">{emailLogs.length}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processed</p>
                <p className="text-xl font-bold">
                  {emailLogs.filter(l => l.status === 'processed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-xl font-bold">
                  {emailLogs.filter(l => l.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">
                  {emailLogs.filter(l => l.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Parser */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Test Message Parser
            </CardTitle>
            <CardDescription>
              Paste a bank notification message to test the parsing logic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste a bank notification message here..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="min-h-24"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleTestParse(false)} className="gap-2">
                <Zap className="h-4 w-4" />
                Test Parse
              </Button>
              <Button 
                onClick={() => handleTestParse(true)} 
                className="gap-2"
                disabled={addEmailLog.isPending}
              >
                <Mail className="h-4 w-4" />
                Add to Logs
              </Button>
            </div>

            {parsedResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-medium">Parsed Result:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>{' '}
                    <span className={parsedResult.amount ? 'text-success font-medium' : 'text-destructive'}>
                      {parsedResult.amount ? `KES ${parsedResult.amount.toLocaleString()}` : 'Not found'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">House No:</span>{' '}
                    <span className={parsedResult.houseNo ? 'font-medium' : 'text-destructive'}>
                      {parsedResult.houseNo || 'Not found'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tenant:</span>{' '}
                    <span className={parsedResult.tenantName ? 'font-medium' : 'text-destructive'}>
                      {parsedResult.tenantName || 'Not found'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">M-Pesa Ref:</span>{' '}
                    <span className={parsedResult.mpesaRef ? 'font-mono' : 'text-destructive'}>
                      {parsedResult.mpesaRef || 'Not found'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Valid:</span>{' '}
                    <span className={parsedResult.isValid ? 'text-success font-medium' : 'text-destructive'}>
                      {parsedResult.isValid ? 'Yes' : 'No - Missing required fields'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Logs Table */}
        <div className="stat-card p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Received</TableHead>
                <TableHead className="max-w-xs">Message Preview</TableHead>
                <TableHead>Parsed Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {format(new Date(log.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm text-muted-foreground">
                      {log.raw_message}
                    </p>
                  </TableCell>
                  <TableCell>
                    {log.parsed_amount && log.parsed_mpesa_ref ? (
                      <div className="text-xs space-y-1">
                        <p><span className="text-muted-foreground">Amount:</span> KES {Number(log.parsed_amount).toLocaleString()}</p>
                        <p><span className="text-muted-foreground">House:</span> {log.parsed_house_no || 'Unknown'}</p>
                        <p className="font-mono text-muted-foreground">{log.parsed_mpesa_ref}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-destructive">{log.error_message || 'Parsing failed'}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {log.status === 'pending' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleProcessPayment(log)}
                          disabled={processEmailLog.isPending}
                          className="gap-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Process
                        </Button>
                      )}
                      {log.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLog(log)}
                          className="gap-1.5"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit & Sync
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredLogs.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No email logs found</h3>
            <p className="text-muted-foreground">Use the test parser above to add payment messages</p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit & Re-sync Message
              </DialogTitle>
              <DialogDescription>
                Edit the message to correct any parsing issues, then preview and sync.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Original Error</label>
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {editingLog?.error_message}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message Content</label>
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="min-h-32"
                  placeholder="Edit the message content..."
                />
              </div>

              <Button variant="outline" onClick={handlePreviewParse} className="gap-2">
                <Zap className="h-4 w-4" />
                Preview Parse Result
              </Button>

              {editPreviewResult && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium">Preview Result:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>{' '}
                      <span className={editPreviewResult.amount ? 'text-success font-medium' : 'text-destructive'}>
                        {editPreviewResult.amount ? `KES ${editPreviewResult.amount.toLocaleString()}` : 'Not found'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">House No:</span>{' '}
                      <span className={editPreviewResult.houseNo ? 'font-medium' : 'text-destructive'}>
                        {editPreviewResult.houseNo || 'Not found'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tenant:</span>{' '}
                      <span className={editPreviewResult.tenantName ? 'font-medium' : 'text-destructive'}>
                        {editPreviewResult.tenantName || 'Not found'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">M-Pesa Ref:</span>{' '}
                      <span className={editPreviewResult.mpesaRef ? 'font-mono' : 'text-destructive'}>
                        {editPreviewResult.mpesaRef || 'Not found'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Valid:</span>{' '}
                      <span className={editPreviewResult.isValid ? 'text-success font-medium' : 'text-destructive'}>
                        {editPreviewResult.isValid ? 'Yes - Ready to sync' : 'No - Missing required fields'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAndSync} 
                className="gap-2"
                disabled={updateEmailLog.isPending}
              >
                <RefreshCw className="h-4 w-4" />
                Save & Sync
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default EmailLogs;
