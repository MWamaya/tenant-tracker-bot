import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ROUTES } from '@/lib/routes';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useEffectiveLandlordId, useImpersonation, assertWritable } from '@/hooks/useImpersonation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Mail,
  Bell,
  Database,
  Clock,
  MessageSquare,
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  CreditCard,
  User,
  Filter,
  FileText,
  Zap,
} from 'lucide-react';
import { BillingTab } from '@/components/billing/BillingTab';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { SectionIcon } from '@/components/settings/SectionIcon';
import { ToggleRow } from '@/components/settings/ToggleRow';

interface ReportRecipient {
  id: string;
  name: string | null;
  email: string;
}

const Settings = () => {
  const landlordId = useEffectiveLandlordId();
  const { viewOnly } = useImpersonation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [reportDay, setReportDay] = useState<string>('5');
  const [savingReportDay, setSavingReportDay] = useState(false);

  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<ReportRecipient | null>(null);
  const [recipientForm, setRecipientForm] = useState({ name: '', email: '' });

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ['report_recipients', landlordId],
    enabled: !!landlordId,
    queryFn: async (): Promise<ReportRecipient[]> => {
      const { data, error } = await supabase
        .from('report_recipients')
        .select('id, name, email')
        .eq('landlord_id', landlordId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const openAddRecipient = () => {
    setEditingRecipient(null);
    setRecipientForm({ name: '', email: '' });
    setRecipientDialogOpen(true);
  };

  const openEditRecipient = (r: ReportRecipient) => {
    setEditingRecipient(r);
    setRecipientForm({ name: r.name || '', email: r.email });
    setRecipientDialogOpen(true);
  };

  const saveRecipient = useMutation({
    mutationFn: async () => {
      assertWritable(viewOnly);
      if (!landlordId) throw new Error('Not signed in');
      const email = recipientForm.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email');
      const name = recipientForm.name.trim() || null;

      if (editingRecipient) {
        const { error } = await supabase
          .from('report_recipients')
          .update({ name, email })
          .eq('id', editingRecipient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_recipients')
          .insert({ landlord_id: landlordId, name, email });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingRecipient ? 'Recipient updated' : 'Recipient added');
      queryClient.invalidateQueries({ queryKey: ['report_recipients'] });
      setRecipientDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save recipient'),
  });

  const deleteRecipient = useMutation({
    mutationFn: async (id: string) => {
      assertWritable(viewOnly);
      const { error } = await supabase.from('report_recipients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recipient removed');
      queryClient.invalidateQueries({ queryKey: ['report_recipients'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove recipient'),
  });

  useEffect(() => {
    if (!landlordId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('inbound_email, report_day_of_month')
        .eq('id', landlordId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setInboundEmail(data.inbound_email);
      if (typeof data.report_day_of_month === 'number') {
        setReportDay(String(data.report_day_of_month));
      }
    })();

    return () => { cancelled = true; };
  }, [landlordId]);

  const saveReportDay = async (value: string) => {
    if (!landlordId) return;
    setReportDay(value);
    setSavingReportDay(true);
    const { error } = await supabase
      .from('profiles')
      .update({ report_day_of_month: Number(value) })
      .eq('id', landlordId);
    setSavingReportDay(false);
    if (error) {
      toast.error('Failed to save monthly report day');
      return;
    }
    toast.success(`Monthly report will be sent on day ${value} of each month`);
  };

  return (
    <MainLayout seo={{ title: "Settings \u2014 KODI PAP", description: "Configure your account, integrations and reminders.", path: ROUTES.SETTINGS }}>
      <div className="space-y-6">
        <AppBreadcrumbs />
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
            <SettingsIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-0.5">
              Configure your rent collection system
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('tab', v);
            return next;
          }, { replace: true })}
          className="space-y-6"
        >
          <TabsList className="bg-muted/50 h-auto flex-wrap p-1.5 gap-1">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:text-primary">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:text-primary">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2 data-[state=active]:text-primary">
              <Mail className="h-4 w-4" />
              Email Integration
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2 data-[state=active]:text-primary">
              <MessageSquare className="h-4 w-4" />
              SMS Integration
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:text-primary">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 data-[state=active]:text-primary">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billing">
            <BillingTab />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Database} />
                  Property Settings
                </CardTitle>
                <CardDescription>
                  Configure default settings for your rental properties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultRent">Default Rent Amount (KES)</Label>
                    <Input id="defaultRent" type="number" placeholder="10000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Rent Due Date (Day of Month)</Label>
                    <Input id="dueDate" type="number" placeholder="5" min="1" max="28" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                  <Input id="gracePeriod" type="number" placeholder="5" />
                  <p className="text-xs text-muted-foreground">
                    Number of days after due date before marking as late
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Clock} />
                  Monthly Report Day
                </CardTitle>
                <CardDescription>
                  Choose which day of each month you want your automatic rent report emailed to you, covering the month that just ended.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-xs">
                  <Label>Send on day</Label>
                  <Select value={reportDay} onValueChange={saveReportDay} disabled={savingReportDay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Users} />
                  Monthly Report Recipients
                </CardTitle>
                <CardDescription>
                  Extra people (e.g. a caretaker) who should be CC'd on the automated monthly report alongside you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recipientsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : recipients.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="table-header">
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.name || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{r.email}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditRecipient(r)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Remove ${r.email} from report recipients?`)) deleteRecipient.mutate(r.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No extra recipients yet. Add one below.</p>
                )}
                <Button variant="outline" onClick={openAddRecipient} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Recipient
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Mail} />
                  Bank Email Forwarding
                </CardTitle>
                <CardDescription>
                  Forward your bank's transaction notification emails to this address to have payments recorded automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inboundEmail ? (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">Your forwarding email</p>
                    <p className="font-mono text-base font-medium mt-1">{inboundEmail}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your forwarding email will appear here once your account is activated by an admin.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Mail} />
                  Gmail API Configuration
                </CardTitle>
                <CardDescription>
                  Connect your Gmail account to automatically parse bank notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Mail className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">Gmail Account</p>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button>Connect Gmail</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    htmlFor="autoSyncEmails"
                    label="Auto-sync Emails"
                    description="Automatically fetch new emails at regular intervals"
                  />

                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Sync Interval (Minutes)</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input id="syncInterval" type="number" placeholder="5" className="w-24" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailFilter">Email Filter Keywords</Label>
                    <Input 
                      id="emailFilter" 
                      placeholder="NCBA, M-Pesa, transaction" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated keywords to identify payment notification emails
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Filter} />
                  Message Parser Settings
                </CardTitle>
                <CardDescription>
                  Configure how payment messages are parsed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow
                  label="Strict Parsing Mode"
                  description="Reject messages that can't be fully parsed"
                />
                <ToggleRow
                  label="Auto-match Tenants"
                  description="Automatically link payments to existing tenants"
                  defaultChecked
                />
                <ToggleRow
                  label="Duplicate Detection"
                  description="Prevent duplicate payments using M-Pesa reference."
                  defaultChecked
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={MessageSquare} />
                  SMS Gateway Configuration
                </CardTitle>
                <CardDescription>
                  Connect an SMS provider to send payment reminders and notifications to tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Smartphone className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">SMS Provider</p>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button>Connect Provider</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smsProvider">SMS Provider</Label>
                    <select 
                      id="smsProvider" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select a provider</option>
                      <option value="africastalking">Africa's Talking</option>
                      <option value="twilio">Twilio</option>
                      <option value="infobip">Infobip</option>
                      <option value="nexmo">Vonage (Nexmo)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smsApiKey">API Key</Label>
                    <Input id="smsApiKey" type="password" placeholder="Enter your API key" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smsUsername">Username / Account ID</Label>
                    <Input id="smsUsername" placeholder="Enter username or account ID" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smsSenderId">Sender ID</Label>
                    <Input id="smsSenderId" placeholder="KODI PAP" />
                    <p className="text-xs text-muted-foreground">
                      The name that will appear as the sender of your SMS messages
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={FileText} />
                  SMS Templates
                </CardTitle>
                <CardDescription>
                  Configure message templates for different notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentReminder">Payment Reminder</Label>
                  <textarea 
                    id="paymentReminder"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Dear {tenant_name}, your rent of KES {amount} for {house_name} is due on {due_date}. Please pay via M-Pesa. Ref: {tenant_id}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{tenant_name}'}, {'{amount}'}, {'{house_name}'}, {'{due_date}'}, {'{tenant_id}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentConfirmation">Payment Confirmation</Label>
                  <textarea 
                    id="paymentConfirmation"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Dear {tenant_name}, we have received your payment of KES {amount} for {house_name}. Ref: {mpesa_ref}. Thank you!"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{tenant_name}'}, {'{amount}'}, {'{house_name}'}, {'{mpesa_ref}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overdueNotice">Overdue Notice</Label>
                  <textarea 
                    id="overdueNotice"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Dear {tenant_name}, your rent of KES {amount} for {house_name} is {days_overdue} days overdue. Please pay immediately to avoid penalties."
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{tenant_name}'}, {'{amount}'}, {'{house_name}'}, {'{days_overdue}'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Zap} />
                  Automated SMS Settings
                </CardTitle>
                <CardDescription>
                  Configure when to automatically send SMS notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow
                  label="Send Payment Reminders"
                  description="Automatically send reminders before due date"
                  defaultChecked
                />
                <div className="space-y-2 px-1">
                  <Label htmlFor="reminderDays">Days Before Due Date</Label>
                  <Input id="reminderDays" type="number" placeholder="3" className="w-24" />
                </div>
                <ToggleRow
                  label="Send Payment Confirmations"
                  description="Notify tenants when payment is received"
                  defaultChecked
                />
                <ToggleRow
                  label="Send Overdue Notices"
                  description="Alert tenants about overdue payments"
                  defaultChecked
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <SectionIcon icon={Bell} />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about rent collection activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow
                  label="New Payment Received"
                  description="Get notified when a new payment is recorded"
                  defaultChecked
                />
                <ToggleRow
                  label="Payment Reminder"
                  description="Remind about unpaid tenants on due date"
                  defaultChecked
                />
                <ToggleRow
                  label="Monthly Summary"
                  description="Receive a summary of monthly collection"
                  defaultChecked
                />
                <ToggleRow
                  label="Failed Email Parse"
                  description="Alert when an email cannot be parsed"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={recipientDialogOpen} onOpenChange={setRecipientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecipient ? 'Edit Recipient' : 'Add Recipient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name (optional)</Label>
              <Input
                placeholder="e.g. Caretaker"
                value={recipientForm.name}
                onChange={(e) => setRecipientForm({ ...recipientForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="caretaker@example.com"
                value={recipientForm.email}
                onChange={(e) => setRecipientForm({ ...recipientForm, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipientDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveRecipient.mutate()} disabled={saveRecipient.isPending}>
              {saveRecipient.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Settings;
