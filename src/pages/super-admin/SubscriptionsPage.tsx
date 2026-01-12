import { useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useSubscriptionPlans } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Check, Building, Users, MessageSquare } from 'lucide-react';

const SubscriptionsPage = () => {
  const { data: plans, isLoading } = useSubscriptionPlans();

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
            <p className="text-slate-400">Manage subscription plans and pricing</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 bg-slate-700" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans?.map((plan) => (
              <Card
                key={plan.id}
                className={`bg-slate-800/50 border-slate-700 ${
                  plan.name === 'Professional' ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{plan.name}</CardTitle>
                    {plan.name === 'Professional' && (
                      <Badge className="bg-primary">Popular</Badge>
                    )}
                  </div>
                  <CardDescription className="text-slate-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div>
                    <span className="text-3xl font-bold text-white">
                      KES {plan.price.toLocaleString()}
                    </span>
                    <span className="text-slate-400">/{plan.duration_days} days</span>
                  </div>

                  {/* Limits */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Building className="h-4 w-4 text-primary" />
                      <span>
                        {plan.max_properties === null
                          ? 'Unlimited'
                          : plan.max_properties}{' '}
                        properties
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="h-4 w-4 text-primary" />
                      <span>
                        {plan.max_tenants === null ? 'Unlimited' : plan.max_tenants}{' '}
                        tenants
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span>{plan.sms_tokens_included} SMS tokens</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 pt-4 border-t border-slate-700">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="h-4 w-4 text-green-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="pt-4">
                    <Badge
                      variant="outline"
                      className={
                        plan.is_active
                          ? 'border-green-500 text-green-400'
                          : 'border-red-500 text-red-400'
                      }
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
    </SuperAdminLayout>
  );
};

export default SubscriptionsPage;
