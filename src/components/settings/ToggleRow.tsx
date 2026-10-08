import { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** A labeled on/off row that's visibly tinted when active, so a long list
 * of toggles reads as live state rather than a flat grey form. */
export function ToggleRow({
  label,
  description,
  defaultChecked,
  htmlFor,
}: {
  label: ReactNode;
  description: ReactNode;
  defaultChecked?: boolean;
  htmlFor?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors',
        defaultChecked ? 'bg-success/5 border-success/20' : 'bg-muted/40 border-transparent',
      )}
    >
      <div>
        <Label htmlFor={htmlFor}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={htmlFor} defaultChecked={defaultChecked} />
    </div>
  );
}
