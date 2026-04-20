import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X } from 'lucide-react';

export const ImpersonationBanner = () => {
  const { impersonating, stopImpersonation } = useImpersonation();

  if (!impersonating) return null;

  return (
    <div className="sticky top-0 z-[100] w-full bg-destructive text-destructive-foreground shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium truncate">
            Super Admin View — managing as{' '}
            <span className="font-bold">{impersonating.name}</span>
            {impersonating.company && (
              <span className="opacity-80"> ({impersonating.company})</span>
            )}
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={stopImpersonation}
          className="h-7 px-3 text-xs flex-shrink-0"
        >
          <X className="h-3 w-3 mr-1" />
          Exit View
        </Button>
      </div>
    </div>
  );
};
