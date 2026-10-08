import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveLandlordId, useImpersonation, assertWritable } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Building2, Phone, Save, Loader2, Lock } from 'lucide-react';

interface ProfileRow {
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
}

const useProfile = (landlordId: string | null) =>
  useQuery({
    queryKey: ['profile-details', landlordId],
    enabled: !!landlordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, company_name, phone')
        .eq('id', landlordId!)
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
  });

const getInitials = (name: string, email?: string) => {
  if (name.trim()) {
    return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }
  return (email?.[0] || '?').toUpperCase();
};

export const ProfileTab = () => {
  const { user } = useAuth();
  const landlordId = useEffectiveLandlordId();
  const { viewOnly } = useImpersonation();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile(landlordId);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      assertWritable(viewOnly);
      if (!landlordId) throw new Error('Not signed in');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          company_name: companyName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', landlordId);
      if (error) throw error;

      // Keep auth metadata in sync — other flows (e.g. the M-Pesa phone
      // prefill) read phone/full_name from user_metadata, not profiles.
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || null,
          company_name: companyName.trim() || null,
          phone: phone.trim() || null,
        },
      });
      if (authError) throw authError;
    },
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['profile-details', landlordId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update profile'),
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary px-6 py-8 sm:px-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary-foreground/20 shrink-0">
            <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-xl font-semibold">
              {getInitials(fullName, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-primary-foreground truncate">
              {fullName || 'Your profile'}
            </h2>
            <p className="text-sm text-primary-foreground/70 truncate">
              {companyName || user?.email}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 pt-6 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="profile-email" className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Email
          </Label>
          <div className="relative">
            <Input id="profile-email" value={user?.email || ''} disabled className="pr-9" />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Can't be changed here — contact support@kodipap.com if you need it updated.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-company" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Company name
          </Label>
          <Input id="profile-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-phone" className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone number
          </Label>
          <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" />
        </div>

        <Button
          onClick={() => saveProfile.mutate()}
          disabled={saveProfile.isPending || viewOnly}
          className="gap-2"
        >
          {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
};
