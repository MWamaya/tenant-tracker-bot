import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { parsePaymentMessage } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Search, RefreshCw, CheckCircle, XCircle, AlertCircle, Mail, Zap, Edit, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EmailLog {
  id: string;
  receivedAt: string;
  subject: string;
  rawMessage: string;
  status: 'processed' | 'failed' | 'pending';
  parsedData?: ReturnType<typeof parsePaymentMessage>;
  error?: string;
}

const initialMockEmailLogs: EmailLog[] = [
  {
    id: '1',
    receivedAt: '2025-01-12T20:05:00',
    subject: 'Payment Received',
    rawMessage: 'Dear MICHAEL O a transaction of KES 10,000.00 for 212245 B2 has been received from BEATRICE ADHIAMBO 079****635 on 12/12/2025 08:01 PM. M-Pesa Ref: TLC5B0WSBC. NCBA, Go for it.',
    status: 'processed',
    parsedData: {
      amount: 10000,
      houseNo: '212245 B2',
      tenantName: 'BEATRICE ADHIAMBO',
      mpesaRef: 'TLC5B0WSBC',
      date: '12/12/2025 08:01 PM',
    },
  },
  {
    id: '2',
    receivedAt: '2025-01-10T14:35:00',
    subject: 'Payment Notification',
    rawMessage: 'Dear MICHAEL O a transaction of KES 8,000.00 for 212245 A1 has been received from JOHN KAMAU 072****678 on 10/01/2025 02:30 PM. M-Pesa Ref: TLC5B1XYZD. NCBA, Go for it.',
    status: 'processed',
    parsedData: {
      amount: 8000,
      houseNo: '212245 A1',
      tenantName: 'JOHN KAMAU',
      mpesaRef: 'TLC5B1XYZD',
      date: '10/01/2025 02:30 PM',
    },
  },
  {
    id: '3',
    receivedAt: '2025-01-09T11:20:00',
    subject: 'Bank Alert',
    rawMessage: 'Your account has been credited with KES 5000. This is a general alert.',
    status: 'failed',
    error: 'Could not parse house number from message',
  },
  {
    id: '4',
    receivedAt: '2025-01-08T09:20:00',
    subject: 'Payment Received',
    rawMessage: 'Dear MICHAEL O a transaction of KES 5,000.00 for 212245 A2 has been received from MARY WANJIKU 073****789 on 08/01/2025 09:15 AM. M-Pesa Ref: TLC5B2ABCE. NCBA, Go for it.',
    status: 'processed',
    parsedData: {
      amount: 5000,
      houseNo: '212245 A2',
      tenantName: 'MARY WANJIKU',
      mpesaRef: 'TLC5B2ABCE',
      date: '08/01/2025 09:15 AM',
    },
  },
];

const EmailLogs = () => {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(initialMockEmailLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [parsedResult, setParsedResult] = useState<ReturnType<typeof parsePaymentMessage> | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<EmailLog | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [editPreviewResult, setEditPreviewResult] = useState<ReturnType<typeof parsePaymentMessage> | null>(null);

  const filteredLogs = emailLogs.filter(log =>
    log.rawMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTestParse = (addToLog: boolean = false) => {
    if (testMessage.trim()) {
      const result = parsePaymentMessage(testMessage);
      setParsedResult(result);
      
      if (addToLog) {
        const hasRequiredFields = result.amount && result.houseNo && result.mpesaRef;
        const newLog: EmailLog = {
          id: Date.now().toString(),
          receivedAt: new Date().toISOString(),
          subject: 'Manual Entry',
          rawMessage: testMessage,
          status: hasRequiredFields ? 'processed' : 'failed',
          parsedData: hasRequiredFields ? result : undefined,
          error: hasRequiredFields ? undefined : 'Could not parse required fields (Amount, House No, or M-Pesa Ref)',
        };
        
        setEmailLogs(prev => [newLog, ...prev]);
        
        if (hasRequiredFields) {
          toast.success('Message parsed and added to logs');
        } else {
          toast.error('Message added to logs as failed - missing required fields');
        }
        
        setTestMessage('');
        setParsedResult(null);
      }
    }
  };

  const handleEditLog = (log: EmailLog) => {
    setEditingLog(log);
    setEditedMessage(log.rawMessage);
    setEditPreviewResult(null);
    setEditDialogOpen(true);
  };

  const handlePreviewParse = () => {
    if (editedMessage.trim()) {
      const result = parsePaymentMessage(editedMessage);
      setEditPreviewResult(result);
    }
  };

  const handleSaveAndSync = () => {
    if (!editingLog || !editedMessage.trim()) return;

    const parsedData = parsePaymentMessage(editedMessage);
    const hasRequiredFields = parsedData.amount && parsedData.houseNo && parsedData.mpesaRef;

    setEmailLogs(prev => prev.map(log => {
      if (log.id === editingLog.id) {
        return {
          ...log,
          rawMessage: editedMessage,
          status: hasRequiredFields ? 'processed' : 'failed',
          parsedData: hasRequiredFields ? parsedData : undefined,
          error: hasRequiredFields ? undefined : 'Could not parse required fields from message',
        };
      }
      return log;
    }));

    if (hasRequiredFields) {
      toast.success('Message updated and synced successfully');
    } else {
      toast.error('Message updated but still missing required fields');
    }

    setEditDialogOpen(false);
    setEditingLog(null);
    setEditedMessage('');
    setEditPreviewResult(null);
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
            <p className="text-muted-foreground mt-1">
              Monitor automated email parsing and payment detection
            </p>
          </div>
          <Button className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Now
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
              <Button onClick={() => handleTestParse(true)} className="gap-2">
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
                    <span className="text-muted-foreground">Date:</span>{' '}
                    <span className={parsedResult.date ? 'font-medium' : 'text-destructive'}>
                      {parsedResult.date || 'Not found'}
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
                <TableHead>Subject</TableHead>
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
                        {format(new Date(log.receivedAt), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.receivedAt), 'h:mm a')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.subject}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm text-muted-foreground">
                      {log.rawMessage}
                    </p>
                  </TableCell>
                  <TableCell>
                    {log.parsedData ? (
                      <div className="text-xs space-y-1">
                        <p><span className="text-muted-foreground">Amount:</span> KES {log.parsedData.amount?.toLocaleString()}</p>
                        <p><span className="text-muted-foreground">House:</span> {log.parsedData.houseNo}</p>
                        <p className="font-mono text-muted-foreground">{log.parsedData.mpesaRef}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-destructive">{log.error}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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
                  {editingLog?.error}
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
                      <span className="text-muted-foreground">Date:</span>{' '}
                      <span className={editPreviewResult.date ? 'font-medium' : 'text-destructive'}>
                        {editPreviewResult.date || 'Not found'}
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
              <Button onClick={handleSaveAndSync} className="gap-2">
                <RotateCcw className="h-4 w-4" />
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
