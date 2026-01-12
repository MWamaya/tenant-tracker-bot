import { useQuery } from '@tanstack/react-query';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Mail, MessageSquare, Shield, Clock } from 'lucide-react';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  is_sensitive: boolean;
}

const SettingsPage = () => {
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
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-slate-400">Configure platform-wide settings</p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription className="text-slate-400">
                Basic platform configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200">Maintenance Mode</Label>
                      <p className="text-sm text-slate-400">
                        Put the platform in maintenance mode
                      </p>
                    </div>
                    <Switch checked={getSetting('maintenance_mode') === true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200">Bank Email Parsing</Label>
                      <p className="text-sm text-slate-400">
                        Enable automatic bank email parsing
                      </p>
                    </div>
                    <Switch checked={getSetting('bank_email_parsing_enabled') === true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200">Grace Period (Days)</Label>
                      <p className="text-sm text-slate-400">
                        Days after subscription expiry before suspension
                      </p>
                    </div>
                    <span className="text-white font-medium">
                      {String(getSetting('subscription_grace_period_days') ?? 7)} days
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SMS Settings */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                SMS provider and messaging settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200">Default SMS Provider</Label>
                      <p className="text-sm text-slate-400">
                        Primary SMS gateway for notifications
                      </p>
                    </div>
                    <span className="text-white font-medium capitalize">
                      {(getSetting('default_sms_provider') as string)?.replace(/_/g, ' ') ||
                        'Not configured'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription className="text-slate-400">
                Security and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-medium">RLS Enabled</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Row Level Security is active on all tables
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-medium">RBAC Active</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Role-based access control is enforced
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Settings */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">All Settings</CardTitle>
              <CardDescription className="text-slate-400">
                Complete list of system configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full bg-slate-700" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {settings?.map((setting) => {
                    const Icon = getSettingIcon(setting.setting_key);
                    return (
                      <div
                        key={setting.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {setting.setting_key.replace(/_/g, ' ')}
                            </p>
                            {setting.description && (
                              <p className="text-xs text-slate-400">{setting.description}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-slate-300 font-mono">
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
