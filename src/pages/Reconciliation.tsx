import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useReconciliation, ReconciliationItem, ReconciliationReason } from '@/hooks/useReconciliation';
import { useHouses } from '@/hooks/useHouses';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CheckCircle2, ChevronsUpDown, Loader2, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const REASON_LABELS: Record<ReconciliationReason, string> = {
  no_house_match: 'No house match found',
  missing_house: 'Missing house',
  missing_tenant: 'Missing tenant',
};

const HousePicker = ({
  onAssign,
  isAssigning,
}: {
  onAssign: (houseId: string) => void;
  isAssigning: boolean;
}) => {
  const { houses, isLoading } = useHouses();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 w-[180px] justify-between" disabled={isAssigning}>
          {isAssigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Assign to house'}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search houses..." />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Loading...' : 'No houses found.'}</CommandEmpty>
            <CommandGroup>
              {houses.map((house) => (
                <CommandItem
                  key={house.id}
                  value={house.house_no}
                  onSelect={() => {
                    setOpen(false);
                    onAssign(house.id);
                  }}
                >
                  {house.house_no}
                  {house.properties?.name && (
                    <span className="ml-2 text-xs text-muted-foreground">{house.properties.name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Reconciliation = () => {
  const { items, isLoading, assign } = useReconciliation();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const handleAssign = (item: ReconciliationItem, houseId: string) => {
    setAssigningId(item.id);
    assign.mutate(
      { item, houseId },
      { onSettled: () => setAssigningId(null) },
    );
  };

  if (isLoading) {
    return (
      <MainLayout seo={{ title: 'Needs Review — KODI PAP', description: 'Payments that need manual reconciliation.', path: '/reconciliation' }}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout seo={{ title: 'Needs Review — KODI PAP', description: 'Payments that need manual reconciliation.', path: '/reconciliation' }}>
      <div className="space-y-6">
        <AppBreadcrumbs />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Needs Review</h1>
            <p className="text-muted-foreground mt-1">
              Payments the system couldn't automatically match to a house
            </p>
          </div>
          {items.length > 0 && <Badge variant="secondary">{items.length} pending</Badge>}
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-medium">All caught up</h3>
              <p className="text-muted-foreground">No payments are waiting on manual reconciliation.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Unmatched payments
              </CardTitle>
              <CardDescription>
                Pick the correct house for each payment below. The house's current tenant is attached automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Parsed house</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.source}-${item.id}`} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="text-sm">{format(new Date(item.date), 'd/M/yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'h:mm a')}</p>
                      </TableCell>
                      <TableCell className="font-medium">KES {item.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{item.senderName || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.mpesaRef}</TableCell>
                      <TableCell className="text-sm">{item.parsedHouseNo || '—'}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border',
                            item.reason === 'no_house_match'
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-warning/10 text-warning border-warning/20',
                          )}
                        >
                          {REASON_LABELS[item.reason]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <HousePicker
                          onAssign={(houseId) => handleAssign(item, houseId)}
                          isAssigning={assigningId === item.id && assign.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Reconciliation;
