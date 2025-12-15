import { payments } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export const RecentPayments = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Payments</h3>
        <Badge variant="secondary" className="text-xs">
          Last 5
        </Badge>
      </div>
      
      <div className="space-y-4">
        {recentPayments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{payment.tenantName}</p>
              <p className="text-xs text-muted-foreground">
                {payment.houseNo} • {format(new Date(payment.date), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-success">{formatCurrency(payment.amount)}</p>
              <p className="text-xs text-muted-foreground font-mono">{payment.mpesaRef}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
