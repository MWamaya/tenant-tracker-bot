import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'paid' | 'partial' | 'unpaid';
  className?: string;
}

const statusConfig = {
  paid: {
    label: 'Paid',
    className: 'status-paid',
  },
  partial: {
    label: 'Partial',
    className: 'status-partial',
  },
  unpaid: {
    label: 'Unpaid',
    className: 'status-unpaid',
  },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
