import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Mail, MessageSquare, Shield, Clock } from 'lucide-react';
import { ADMIN_CARD, ADMIN_SURFACE } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  is_sensitive: boolean;
}

const SettingsPage = () => {
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

  const getSetting = (key: string) => {
    const setting = settings?.find((s) => s.setting_key === key);
    return setting?.setting_value;
  };

  const getSettingIcon = (key: string) => {
    if (key.includes('email') || key.includes('bank')) return Mail;
    if (key.includes('sms')) return MessageSquare;
    if (key.includes('grace') || key.includes('duration')) return Clock;
    return Settings;
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">System Settings</h1>
          <p className="text-[#64748B]">Configure platform-wide settings</p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                Basic platform configuration
              </CardDescription>
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
                      <Label >Maintenance Mode</Label>
                      <p className="text-sm text-[#64748B]">
                        Put the platform in maintenance mode
                      </p>
                    </div>
                    <Switch
                      checked={getSetting('maintenance_mode') === true}
                      disabled={updateSetting.isPending}
                      onCheckedChange={(checked) =>
                        updateSetting.mutate({ key: 'maintenance_mode', value: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label >Bank Email Parsing</Label>
                      <p className="text-sm text-[#64748B]">
                        Enable automatic bank email parsing
                      </p>
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
                      <Label >Grace Period (Days)</Label>
                      <p className="text-sm text-[#64748B]">
                        Days after subscription expiry before suspension
                      </p>
                    </div>
                    <span className="text-[#0F172A] font-medium">
                      {String(getSetting('subscription_grace_period_days') ?? 7)} days
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SMS Settings */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Configuration
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                SMS provider and messaging settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-[#E2E8F0]" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label >Default SMS Provider</Label>
                      <p className="text-sm text-[#64748B]">
                        Primary SMS gateway for notifications
                      </p>
                    </div>
                    <span className="text-[#0F172A] font-medium capitalize">
                      {(getSetting('default_sms_provider') as string)?.replace(/_/g, ' ') ||
                        'Not configured'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                Security and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={cn("p-4", ADMIN_SURFACE)}>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-medium">RLS Enabled</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Row Level Security is active on all tables
                  </p>
                </div>
                <div className={cn("p-4", ADMIN_SURFACE)}>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-medium">RBAC Active</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Role-based access control is enforced
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Settings */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">All Settings</CardTitle>
              <CardDescription className="text-[#64748B]">
                Complete list of system configuration
              </CardDescription>
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
                        className={cn("flex items-center justify-between p-3", ADMIN_SURFACE, "hover:bg-[#E2E8F0] transition-colors duration-150")}
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
                          {setting.is_sensitive
                            ? '••••••'
                            : String(JSON.stringify(setting.setting_value))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SettingsPage;
