import { useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Columns3, Download } from 'lucide-react';
import { CsvColumn, downloadCsv, rowsToCsv } from '@/lib/csvExport';
import { cn } from '@/lib/utils';

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  csvColumns: CsvColumn<TData>[];
  csvFilename: string;
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyMessage: string;
  footer?: React.ReactNode;
  /** When set, rows are clickable and navigate/act via this handler. Put
   * `onClick={(e) => e.stopPropagation()}` on any interactive cell content
   * (buttons, menus) that shouldn't also trigger the row click. */
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  columns,
  data,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  csvColumns,
  csvFilename,
  isLoading,
  loadingRowCount = 5,
  emptyMessage,
  footer,
  onRowClick,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) =>
      onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
    onColumnVisibilityChange: (updater) =>
      onColumnVisibilityChange(
        typeof updater === 'function' ? updater(columnVisibility) : updater
      ),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const hideableColumns = useMemo(
    () => table.getAllColumns().filter((c) => c.getCanHide()),
    [table]
  );

  const visibleColumnCount = table.getVisibleLeafColumns().length;

  const handleExportCsv = () => {
    const visibleIds = new Set(table.getVisibleLeafColumns().map((c) => c.id));
    const exportColumns = csvColumns.filter((c) => !c.id || visibleIds.has(c.id));
    const exportRows = table.getSortedRowModel().rows.map((r) => r.original);
    downloadCsv(csvFilename, rowsToCsv(exportRows, exportColumns));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-[#E2E8F0] text-[#1E3A5F]">
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hideableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[#E2E8F0] text-[#1E3A5F]"
          onClick={handleExportCsv}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-lg border border-[#E2E8F0] overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium text-[#0F172A]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={visibleColumnCount}>
                    <Skeleton className="h-6 w-full bg-[#E2E8F0]" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-[#64748B]">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {footer}
    </div>
  );
}
