import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import SubscriptionPlansManager from '@/components/super-admin/SubscriptionPlansManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useTwoFactorSettings,
  useUpdateTwoFactorSettings,
  useSuperAdmins,
  useCreateSuperAdmin,
  useRevokeSuperAdmin,
} from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Settings, Mail, MessageSquare, Shield, Clock, User, CreditCard, UserPlus, Trash2, Users, KeyRound } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  is_sensitive: boolean;
}

const ProfileTab = () => {
  const { user, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fullName = (user?.user_metadata?.full_name as string | undefined) || 'Super Admin';

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setSubmitting(false);
    if (error) {
      toast.error(`Failed to update password: ${error.message}`);
      return;
    }
    toast.success('Password updated');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription className="text-[#64748B]">Your super admin account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#64748B]">Name</Label>
              <p className="text-[#0F172A]">{fullName}</p>
            </div>
            <div>
              <Label className="text-[#64748B]">Email</Label>
              <p className="text-[#0F172A]">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Change Password</CardTitle>
            <CardDescription className="text-[#64748B]">Update your login password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={submitting || !newPassword || !confirmPassword}
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <TwoFactorCard />
    </div>
  );
};

const useSystemSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSetting[]> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data || [];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'UPDATE_SYSTEM_SETTING',
        entity_type: 'system_setting',
        entity_id: key,
        new_values: { [key]: value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Setting updated');
    },
    onError: (error) => {
      toast.error(`Failed to update setting: ${error.message}`);
    },
  });

  const getSetting = (key: string) => settings?.find((s) => s.setting_key === key)?.setting_value;

  return { settings, isLoading, updateSetting, getSetting };
};

const getSettingIcon = (key: string) => {
  if (key.includes('email') || key.includes('bank')) return Mail;
  if (key.includes('sms')) return MessageSquare;
  if (key.includes('grace') || key.includes('duration')) return Clock;
  return Settings;
};

const GeneralTab = () => {
  const { settings, isLoading, updateSetting, getSetting } = useSystemSettings();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className={ADMIN_CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription className="text-[#64748B]">Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-[#E2E8F0]" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-[#64748B]">Put the platform in maintenance mode</p>
                </div>
                <Switch
                  checked={getSetting('maintenance_mode') === true}
                  disabled={updateSetting.isPending}
                  onCheckedChange={(checked) => updateSetting.mutate({ key: 'maintenance_mode', value: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bank Email Parsing</Label>
                  <p className="text-sm text-[#64748B]">Enable automatic bank email parsing</p>
                </div>
                <Switch
                  checked={getSetting('bank_email_parsing_enabled') === true}
                  disabled={updateSetting.isPending}
                  onCheckedChange={(checked) =>
                    updateSetting.mutate({ key: 'bank_email_parsing_enabled', value: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Grace Period (Days)</Label>
                  <p className="text-sm text-[#64748B]">Days after subscription expiry before suspension</p>
                </div>
                <span className="text-[#0F172A] font-medium">
                  {String(getSetting('subscription_grace_period_days') ?? 7)} days
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={ADMIN_CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">All Settings</CardTitle>
          <CardDescription className="text-[#64748B]">Complete list of system configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full bg-[#E2E8F0]" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {settings?.map((setting) => {
                const Icon = getSettingIcon(setting.setting_key);
                return (
                  <div
                    key={setting.id}
                    className={cn('flex items-center justify-between p-3', ADMIN_SURFACE, ADMIN_SURFACE_HOVER)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-[#0F766E]" />
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">
                          {setting.setting_key.replace(/_/g, ' ')}
                        </p>
                        {setting.description && (
                          <p className="text-xs text-[#64748B]">{setting.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#0F172A] font-mono">
                      {setting.is_sensitive ? '••••••' : String(JSON.stringify(setting.setting_value))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SmsTab = () => {
  const { isLoading, getSetting } = useSystemSettings();

  return (
    <Card className={cn(ADMIN_CARD, 'max-w-xl')}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Africa's Talking (SMS)
        </CardTitle>
        <CardDescription className="text-[#64748B]">SMS provider and messaging settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-12 w-full bg-[#E2E8F0]" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Default SMS Provider</Label>
              <p className="text-sm text-[#64748B]">Primary SMS gateway for notifications</p>
            </div>
            <span className="text-[#0F172A] font-medium capitalize">
              {(getSetting('default_sms_provider') as string)?.replace(/_/g, ' ') || 'Not configured'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TwoFactorCard = () => {
  const { data: settings, isLoading } = useTwoFactorSettings();
  const updateSettings = useUpdateTwoFactorSettings();

  return (
    <Card className={cn(ADMIN_CARD, 'max-w-xl')}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-[#64748B]">
          Require a 6-digit code at login, on top of your password. Off by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-12 w-full bg-[#E2E8F0]" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable two-factor authentication</Label>
                <p className="text-sm text-[#64748B]">You'll be asked for a code every time you sign in</p>
              </div>
              <Switch
                checked={settings?.enabled ?? false}
                disabled={updateSettings.isPending}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({ enabled: checked, method: settings?.method ?? 'email' })
                }
              />
            </div>
            {settings?.enabled && (
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <Label>Delivery method</Label>
                <Select
                  value={settings.method}
                  onValueChange={(value: 'email' | 'sms') =>
                    updateSettings.mutate({ enabled: true, method: value })
                  }
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms" disabled>
                      SMS (coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const SecurityTab = () => (
  <div className="space-y-6">
    <Card className={cn(ADMIN_CARD, 'max-w-xl')}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription className="text-[#64748B]">Security and access control settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className={cn('p-4', ADMIN_SURFACE)}>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-sm font-medium">RLS Enabled</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">Row Level Security is active on all tables</p>
          </div>
          <div className={cn('p-4', ADMIN_SURFACE)}>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-sm font-medium">RBAC Active</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">Role-based access control is enforced</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const AdminsTab = () => {
  const { user } = useAuth();
  const { data: admins, isLoading } = useSuperAdmins();
  const createAdmin = useCreateSuperAdmin();
  const revokeAdmin = useRevokeSuperAdmin();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  const handleInvite = async () => {
    if (!fullName.trim() || !email.trim()) return;
    await createAdmin.mutateAsync({ fullName: fullName.trim(), email: email.trim() });
    setInviteOpen(false);
    setFullName('');
    setEmail('');
  };

  return (
    <Card className={ADMIN_CARD}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
            <Users className="h-5 w-5" />
            Super Admins
          </CardTitle>
          <CardDescription className="text-[#64748B]">
            People with full platform administration access
          </CardDescription>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          Add Super Admin
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full bg-[#E2E8F0]" />
            ))}
          </div>
        ) : !admins || admins.length === 0 ? (
          <p className="text-[#64748B] text-sm py-4 text-center">No super admins found</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => {
              const isSelf = admin.id === user?.id;
              return (
                <div key={admin.id} className={cn('flex items-center justify-between p-3', ADMIN_SURFACE)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
                      <span className="text-[#0F766E] font-semibold text-sm">{admin.full_name?.[0] || 'A'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#0F172A] truncate">{admin.full_name || 'Unnamed admin'}</p>
                        {isSelf && (
                          <Badge variant="outline" className="border-[#0F766E]/40 text-[#0F766E] text-[10px]">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] truncate">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#64748B] hidden sm:inline">Joined {formatDate(admin.created_at)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSelf}
                      title={isSelf ? "You can't revoke your own access" : undefined}
                      className="border-destructive/40 text-destructive hover:bg-destructive/5 disabled:opacity-40"
                      onClick={() => setRevokeTarget({ id: admin.id, name: admin.full_name || admin.email || 'this admin' })}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Super Admin</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              They'll be emailed a link to set their own password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Jane Wanjiru" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., jane@kodipap.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={createAdmin.isPending || !fullName.trim() || !email.trim()}>
              {createAdmin.isPending ? 'Sending invite…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.name} will immediately lose all super admin access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!revokeTarget) return;
                await revokeAdmin.mutateAsync(revokeTarget.id);
                setRevokeTarget(null);
              }}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['profile', 'general', 'sms', 'security', 'admins', 'subscriptions'];
  const initialTab = validTabs.includes(searchParams.get('tab') || '') ? searchParams.get('tab')! : 'profile';

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Settings</h1>
          <p className="text-[#64748B]">Manage your account and platform configuration</p>
        </div>

        <Tabs
          defaultValue={initialTab}
          onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Security
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="general" className="mt-6">
            <GeneralTab />
          </TabsContent>
          <TabsContent value="sms" className="mt-6">
            <SmsTab />
          </TabsContent>
          <TabsContent value="security" className="mt-6">
            <SecurityTab />
          </TabsContent>
          <TabsContent value="admins" className="mt-6">
            <AdminsTab />
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-6">
            <SubscriptionPlansManager />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default SettingsPage;
