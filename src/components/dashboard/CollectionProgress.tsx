import { Progress } from '@/components/ui/progress';

interface CollectionProgressProps {
  collected: number;
  expected: number;
  percentage: number;
}

export const CollectionProgress = ({ collected, expected, percentage }: CollectionProgressProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="stat-card animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">Monthly Collection Progress</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Collected</span>
          <span className="font-semibold text-success">{formatCurrency(collected)}</span>
        </div>
        
        <Progress value={percentage} className="h-3" />
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Expected</span>
          <span className="font-semibold">{formatCurrency(expected)}</span>
        </div>
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Collection Rate</span>
            <span className="text-2xl font-bold text-success">{percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
