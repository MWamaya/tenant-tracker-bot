import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Bell, 
  Shield, 
  Database,
  Clock,
  Save,
  MessageSquare,
  Smartphone
} from 'lucide-react';

const Settings = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your rent collection system
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Integration
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Integration
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
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
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Manage your admin account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin Name</Label>
                    <Input id="adminName" placeholder="Michael O" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input id="adminEmail" type="email" placeholder="admin@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPhone">Phone Number</Label>
                  <Input id="adminPhone" placeholder="+254 7XX XXX XXX" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Gmail API Configuration
                </CardTitle>
                <CardDescription>
                  Connect your Gmail account to automatically parse bank notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <Mail className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">Gmail Account</p>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button>Connect Gmail</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-sync Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically fetch new emails at regular intervals
                      </p>
                    </div>
                    <Switch />
                  </div>

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
                <CardTitle>Message Parser Settings</CardTitle>
                <CardDescription>
                  Configure how payment messages are parsed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Strict Parsing Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reject messages that can't be fully parsed
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-match Tenants</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically link payments to existing tenants
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Duplicate Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent duplicate payments using M-Pesa reference
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Gateway Configuration
                </CardTitle>
                <CardDescription>
                  Connect an SMS provider to send payment reminders and notifications to tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <Smartphone className="h-5 w-5 text-destructive" />
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
                <CardTitle>SMS Templates</CardTitle>
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
                <CardTitle>Automated SMS Settings</CardTitle>
                <CardDescription>
                  Configure when to automatically send SMS notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label>Send Payment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send reminders before due date
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminderDays">Days Before Due Date</Label>
                  <Input id="reminderDays" type="number" placeholder="3" className="w-24" />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label>Send Payment Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify tenants when payment is received
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label>Send Overdue Notices</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert tenants about overdue payments
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about rent collection activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label>New Payment Received</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a new payment is recorded
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label>Payment Reminder</Label>
                    <p className="text-sm text-muted-foreground">
                      Remind about unpaid tenants on due date
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label>Monthly Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a summary of monthly collection
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label>Failed Email Parse</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when an email cannot be parsed
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
