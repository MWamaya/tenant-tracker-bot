import { useEffect, useState } from 'react';
import type { SortingState, VisibilityState } from '@tanstack/react-table';
import { loadViewState, saveViewState } from '@/lib/tableViewStorage';

export interface TableViewState {
  search: string;
  statusFilter: string;
  sorting: SortingState;
  columnVisibility: VisibilityState;
}

const DEFAULT_VIEW_STATE: TableViewState = {
  search: '',
  statusFilter: 'all',
  sorting: [],
  columnVisibility: {},
};

// Auto-persists a table's search/status-filter/sort/column-visibility to
// localStorage, keyed by storageKey, so a page remembers its last-used
// view between visits. Not a named/multi-view feature — one slot per page.
export const useTableViewState = (storageKey: string) => {
  const [state, setState] = useState<TableViewState>(() =>
    loadViewState(window.localStorage, storageKey, DEFAULT_VIEW_STATE)
  );

  useEffect(() => {
    saveViewState(window.localStorage, storageKey, state);
  }, [storageKey, state]);

  return {
    search: state.search,
    setSearch: (search: string) => setState((s) => ({ ...s, search })),
    statusFilter: state.statusFilter,
    setStatusFilter: (statusFilter: string) => setState((s) => ({ ...s, statusFilter })),
    sorting: state.sorting,
    setSorting: (sorting: SortingState) => setState((s) => ({ ...s, sorting })),
    columnVisibility: state.columnVisibility,
    setColumnVisibility: (columnVisibility: VisibilityState) =>
      setState((s) => ({ ...s, columnVisibility })),
  };
};
