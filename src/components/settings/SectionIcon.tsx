import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Consistent colored icon chip used in front of every Settings section
 * title, so the page reads as one designed system instead of plain
 * muted-grey icons scattered across flat cards. */
export function SectionIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0', className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
