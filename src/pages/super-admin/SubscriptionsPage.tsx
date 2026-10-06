import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useSubscriptionPlans, useUpdateSubscriptionPlan } from '@/hooks/useSuperAdminData';
import type { SubscriptionPlan } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Building, Users, MessageSquare, Pencil } from 'lucide-react';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const EditPlanDialog = ({
  plan,
  open,
  onOpenChange,
}: {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const updatePlan = useUpdateSubscriptionPlan();
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [maxProperties, setMaxProperties] = useState('');
  const [maxTenants, setMaxTenants] = useState('');
  const [smsTokens, setSmsTokens] = useState('');
  const [features, setFeatures] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (plan) {
      setPrice(String(plan.price));
      setDescription(plan.description || '');
      setMaxProperties(plan.max_properties === null ? '' : String(plan.max_properties));
      setMaxTenants(plan.max_tenants === null ? '' : String(plan.max_tenants));
      setSmsTokens(String(plan.sms_tokens_included));
      setFeatures(plan.features.join('\n'));
      setIsActive(plan.is_active);
    }
  }, [plan]);

  const handleSubmit = async () => {
    if (!plan) return;
    const parsedPrice = parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    await updatePlan.mutateAsync({
      planId: plan.id,
      price: parsedPrice,
      description: description.trim(),
      maxProperties: maxProperties.trim() === '' ? null : parseInt(maxProperties, 10),
      maxTenants: maxTenants.trim() === '' ? null : parseInt(maxTenants, 10),
      smsTokensIncluded: Number.isFinite(parseInt(smsTokens, 10)) ? parseInt(smsTokens, 10) : 0,
      features: features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      isActive,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {plan?.name}</DialogTitle>
          <DialogDescription className="text-[#64748B]">
            Plan name isn't editable here — the public site matches plans by name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Price (KES / {plan?.duration_days} days)</Label>
            <Input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Properties</Label>
              <Input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={maxProperties}
                onChange={(e) => setMaxProperties(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Tenants</Label>
              <Input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={maxTenants}
                onChange={(e) => setMaxTenants(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>SMS Tokens Included</Label>
            <Input
              type="number"
              min="0"
              value={smsTokens}
              onChange={(e) => setSmsTokens(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Features (one per line)</Label>
            <Textarea
              className="min-h-[100px]"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn("border-[#E2E8F0] text-[#1E3A5F]", ADMIN_SURFACE_HOVER)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updatePlan.isPending || !Number.isFinite(parseFloat(price)) || parseFloat(price) < 0}
          >
            {updatePlan.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SubscriptionsPage = () => {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Subscription Plans</h1>
            <p className="text-[#64748B]">Manage subscription plans and pricing</p>
          </div>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 bg-[#E2E8F0]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans?.map((plan) => (
              <Card
                key={plan.id}
                className={cn(ADMIN_CARD, plan.name === 'Pro' && 'ring-2 ring-[#0F766E]')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">{plan.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {plan.name === 'Pro' && <Badge className="bg-[#0F766E]">Popular</Badge>}
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-7 w-7 text-[#64748B] hover:text-[#0F172A]", ADMIN_SURFACE_HOVER)}
                        onClick={() => setEditingPlan(plan)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-[#64748B]">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div>
                    <span className="text-3xl font-bold text-[#0F172A]">
                      KES {plan.price.toLocaleString()}
                    </span>
                    <span className="text-[#64748B]">/{plan.duration_days} days</span>
                  </div>

                  {/* Limits */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Building className="h-4 w-4 text-[#0F766E]" />
                      <span>
                        {plan.max_properties === null
                          ? 'Unlimited'
                          : plan.max_properties}{' '}
                        properties
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Users className="h-4 w-4 text-[#0F766E]" />
                      <span>
                        {plan.max_tenants === null ? 'Unlimited' : plan.max_tenants}{' '}
                        tenants
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <MessageSquare className="h-4 w-4 text-[#0F766E]" />
                      <span>{plan.sms_tokens_included} SMS tokens</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 pt-4 border-t border-[#E2E8F0]">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-[#0F172A]">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="pt-4">
                    <Badge
                      variant="outline"
                      className={plan.is_active ? STATUS_BADGE_CLASSES.success : STATUS_BADGE_CLASSES.destructive}
                    >
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EditPlanDialog
        plan={editingPlan}
        open={!!editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      />
    </SuperAdminLayout>
  );
};

export default SubscriptionsPage;
