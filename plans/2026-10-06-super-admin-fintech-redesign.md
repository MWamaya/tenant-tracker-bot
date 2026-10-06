# Super-Admin Fintech-Trust Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the super-admin area's dark "premium SaaS" theme with a light navy+teal fintech-operations-console theme, add a schema-backed "Needs Attention" dashboard widget, and convert the Landlords/Payments/Onboarding Requests pages from card-stacks to sortable, exportable data tables.

**Architecture:** Three independent layers, built bottom-up: (1) shared light-theme tokens + re-themed shell/pages, (2) two new pure/testable utility modules (CSV export, persisted table-view state) plus a generic `DataTable` component built on `@tanstack/react-table`, (3) a `useNeedsAttention`-style pair of new count hooks feeding a new dashboard widget. Theme-only pages are swapped mechanically once the token layer lands; the three table-conversion pages depend on `DataTable` landing first.

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui, `@tanstack/react-query` (existing), `@tanstack/react-table` (new dependency this plan adds), Supabase, Vitest (`node` environment, `src/**/*.test.ts` only — no component/DOM testing in this repo).

**Spec:** `specs/2026-10-06-super-admin-fintech-redesign-design.md`

## Global Constraints

- Every status color stays on the app's semantic tokens (`--success`,
  `--warning`, `--destructive`) — no new literal color overrides, except
  `info` (no semantic token exists app-wide) which uses a literal teal:
  `border-[#0F766E]/40 text-[#0F766E]`.
- No new backend tables, RLS policies, or edge functions in this plan.
- No named/multi-slot saved table views — auto-persisted last-used state
  only (search, status filter, sort, column visibility), one slot per page,
  keyed by a `storageKey` string, written to `localStorage`.
- `npx tsc --noEmit -p .` must be clean before every commit in this plan.
- Every commit that touches a `.tsx` page must be followed by a live
  browser check (dev server at `http://localhost:8080`) before moving to
  the next task — this repo has no component/DOM test infra, so this is
  the established verification method for this area (confirmed: no
  `src/pages/super-admin/**/*.test.*` or `src/components/super-admin/**/
  *.test.*` files exist).
- Never attribute commits to Claude in the commit message (standing repo
  convention for this project).

**Canonical light-theme token table** (used by every page task below):

| Old (dark) | New (light) |
|---|---|
| `bg-[#121a2e]` (card/dialog/select/dropdown bg) | `bg-white` |
| `border-white/10` | `border-[#E2E8F0]` |
| `bg-white/[0.04]` (input/select bg) | `bg-white` |
| `bg-white/[0.06]` (skeleton bg) | `bg-[#E2E8F0]` |
| `text-white` (headings/primary text) | `text-[#0F172A]` |
| `text-slate-200` / `text-slate-300` | `text-[#0F172A]` |
| `text-slate-400` (secondary text) | `text-[#64748B]` |
| `text-slate-500` (tertiary text) | `text-[#64748B]` |
| `text-slate-700` (empty-state icon) | `text-[#CBD5E1]` |
| `ADMIN_CARD` constant | (redefined in Task 2 — call sites unchanged) |
| `ADMIN_SURFACE` constant | (redefined in Task 2 — call sites unchanged) |
| `hover:bg-white/[0.06]` / `hover:bg-white/10` | `hover:bg-[#F8FAFC]` |
| page/shell background (`bg-[#0b1220]`, gradient) | `bg-[#F8FAFC]` |
| sidebar `bg-[#0a0f1d]` | `bg-[#0F172A]` (unchanged hex family — stays dark) |
| nav active `bg-primary/15` + primary glow | `bg-[#CCFBF1]` + `border-l-[#0F766E]` left bar, icon/text `text-[#0F766E]` |

## Review Focus

1. **CSV export with special characters** — sender names, company names,
   and raw email text can contain commas, double quotes, or embedded
   newlines (e.g. a sender name like `"Doe, John"` or a parsed email
   snippet with line breaks). An unescaped CSV breaks on the next column.
   Covered in Task 4's `rowsToCsv` tests.
2. **`localStorage` unavailable** (private browsing, storage disabled, quota
   exceeded) — must not crash the page or block rendering; falls back to
   default/session-only view state. Covered in Task 5's tests.
3. **One "Needs Attention" signal failing must not blank the other three**
   — ruled out `Promise.all` (spec's original architecture summary) in
   favor of independent `useQuery` hooks per signal, matching this
   dashboard's existing composition pattern. Covered in Task 7/8.
4. **Missing or invalid `?tab=` query param on the Payments page** — must
   default to the `"all"` tab rather than rendering `Tabs` with an invalid
   `defaultValue` (shadcn's `Tabs` silently shows nothing if the value
   doesn't match a `TabsTrigger`). Covered in Task 10.
5. **Actions column must never be hideable** — an admin who hides it via
   the column-visibility toggle would have no way to act on a row. Every
   `DataTable` "Actions" column sets `enableHiding: false`. Covered in
   Task 6 (the component enforces nothing itself — hideability is set per
   column — so each page task that defines an Actions column explicitly
   sets this and Task 6's test is on `DataTable` correctly excluding
   `enableHiding: false` columns from its visibility dropdown).

---

### Task 1: Add `@tanstack/react-table` dependency

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `@tanstack/react-table` importable from any file as
  `import { ... } from '@tanstack/react-table'`.

- [ ] **Step 1: Install the package**

```bash
cd "/Users/admin/Desktop/Work/DM Hub/tenant-tracker-bot" && npm install @tanstack/react-table
```

- [ ] **Step 2: Verify it resolves**

```bash
npx tsc --noEmit -p .
```
Expected: clean (no output) — the package isn't imported anywhere yet, so this just confirms install didn't break the existing build.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-table for the super-admin data tables"
```

---

### Task 2: Light theme tokens + re-themed shell

**Files:**
- Modify: `src/lib/adminStatusColors.ts`
- Modify: `src/components/super-admin/SuperAdminLayout.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ADMIN_CARD: string`, `ADMIN_SURFACE: string`,
  `STATUS_BADGE_CLASSES: Record<'success'|'warning'|'destructive'|'info'|
  'neutral', string>` — same names and shape every other super-admin file
  already imports, just re-themed. No call-site changes required anywhere
  else in the app for this task.

This task combines the token file and the shell on purpose: shipping the
light `ADMIN_CARD`/`ADMIN_SURFACE` alone, before the shell's background
goes light, would render white cards on a still-dark page (the exact bug
hit and fixed during the prior dark redesign, in reverse) — an unusable
intermediate state. Landing both together keeps every commit in this plan
shippable.

- [ ] **Step 1: Rewrite `src/lib/adminStatusColors.ts`**

Replace the full file content with:

```ts
// Shared status-badge color classes for the super-admin area. Status
// colors stay on the app's semantic tokens (success/warning/destructive)
// since the light theme's white cards render them correctly without the
// literal-color workaround the old dark-mode theme needed.
//
// "info" has no semantic token anywhere in the app, so it stays a literal
// teal — matching the admin area's navy+teal palette.
export const STATUS_BADGE_CLASSES = {
  success: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  destructive: 'border-destructive/40 text-destructive',
  info: 'border-[#0F766E]/40 text-[#0F766E]',
  neutral: 'border-slate-300 text-slate-500',
} as const;

export type StatusBadgeTone = keyof typeof STATUS_BADGE_CLASSES;

// Shared card treatment for the super-admin area: white card, light slate
// border, soft shadow — a calm "operations console" surface rather than
// the gradient/glow treatment the old dark theme used.
export const ADMIN_CARD = 'bg-white border border-[#E2E8F0] shadow-sm rounded-xl';

// Nested/inset surfaces inside a card (table rows, list items).
export const ADMIN_SURFACE = 'bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg';
export const ADMIN_SURFACE_HOVER = 'hover:bg-[#F1F5F9] transition-colors duration-150';
```

- [ ] **Step 2: Re-theme `src/components/super-admin/SuperAdminLayout.tsx`**

Open the file. Replace the `NavContent` function body and the
`SuperAdminLayout` function body with the following (everything else —
imports, `navItems`, component signatures — stays unchanged):

```tsx
  return (
    <div className="flex flex-col h-full bg-[#0F172A]">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link to={ROUTES.SUPER_ADMIN_ROOT} className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 rounded-xl bg-[#0F766E]/20 border border-[#0F766E]/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#2DD4BF]" />
          </div>
          <div>
            <h1 className="font-semibold tracking-tight text-white">Kodipap</h1>
            <p className="text-xs text-slate-400">Super Admin</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-[#CCFBF1]/10 text-white'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#2DD4BF]" />
                )}
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive ? 'text-[#2DD4BF]' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/[0.04]"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px] mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between p-4 bg-[#0F172A] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#2DD4BF]" />
          <span className="font-semibold tracking-tight text-white">Super Admin</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[#0F172A] border-white/10">
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col bg-[#0F172A] border-r border-white/10">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 4: Live-verify**

Navigate to `http://localhost:8080/app/super-admin` (already-authenticated
super-admin session expected, matching this session's established dev
workflow). Confirm: sidebar is dark navy with a teal active-item indicator,
main content area is light slate, every other page still renders (they'll
look broken/mixed-theme until their own tasks land — that's expected and
fine for this step; just confirm nothing crashes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminStatusColors.ts src/components/super-admin/SuperAdminLayout.tsx
git commit -m "redesign: switch super-admin shell and shared tokens to light navy+teal theme"
```

---

### Task 3: Dashboard re-theme + de-tint stat cards

**Files:**
- Modify: `src/pages/super-admin/SuperAdminDashboard.tsx`

**Interfaces:**
- Consumes: `ADMIN_CARD`, `ADMIN_SURFACE`, `STATUS_BADGE_CLASSES` from
  Task 2.
- Produces: no new exports — `SuperAdminDashboard` default export
  unchanged in shape; `StatCard`'s `tint` prop is removed (internal to
  this file, not used elsewhere).

- [ ] **Step 1: Remove the `TINTS` map and `tint` prop from `StatCard`**

In `src/pages/super-admin/SuperAdminDashboard.tsx`, delete the `TINTS`
constant entirely and change the `StatCard` component to:

```tsx
const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  loading,
  error,
  onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  /** When true, shows a distinct error state instead of falling back to a
   * misleading "0" that's indistinguishable from a real zero count. */
  error?: boolean;
  onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    className={cn(
      ADMIN_CARD,
      onClick && 'cursor-pointer hover:border-[#0F766E]/40 transition-colors duration-150'
    )}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-[#64748B]">{title}</CardTitle>
      <div className="p-2 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0]">
        <Icon className="h-4 w-4 text-[#1E3A5F]" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-24 bg-[#E2E8F0]" />
      ) : error ? (
        <div className="flex items-center gap-1.5 text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Failed to load</span>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold tracking-tight text-[#0F172A]">{value}</div>
          {description && (
            <p className="text-xs text-[#64748B] mt-1.5">{description}</p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);
```

- [ ] **Step 2: Remove every `tint="..."` prop from the `<StatCard .../>`
  call sites**

There are 9 call sites in this file (one per stat), each currently has a
line like `tint="violet"` or `tint="blue"` etc. — delete that line from
each `<StatCard ... />` block. Leave every other prop (`title`, `value`,
`description`, `icon`, `loading`, `error`, `onClick`) unchanged.

- [ ] **Step 3: Re-theme the header and Recent Landlords section**

Replace:
```tsx
          <h1 className="text-2xl font-semibold tracking-tight text-white">Platform Overview</h1>
          <p className="text-slate-400">Welcome to the Super Admin Dashboard</p>
```
with:
```tsx
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Platform Overview</h1>
          <p className="text-[#64748B]">Welcome to the Super Admin Dashboard</p>
```

Replace:
```tsx
          <CardTitle className="text-lg font-semibold tracking-tight text-white">Recent Landlords</CardTitle>
          <CardDescription className="text-slate-400">
```
with:
```tsx
          <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Recent Landlords</CardTitle>
          <CardDescription className="text-[#64748B]">
```

Replace `bg-white/[0.06]` (skeleton) with `bg-[#E2E8F0]`.

Replace the landlord-row avatar circle:
```tsx
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">
```
with:
```tsx
                      <div className="w-10 h-10 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
                        <span className="text-[#0F766E] font-semibold">
```

Replace every remaining `text-white` in this file with `text-[#0F172A]`,
every `text-slate-400` with `text-[#64748B]`, every `text-slate-500` with
`text-[#64748B]`, and the row surface:
```tsx
                    className={cn('flex items-center justify-between p-3', ADMIN_SURFACE, 'hover:bg-white/[0.06] transition-colors duration-150')}
```
with:
```tsx
                    className={cn('flex items-center justify-between p-3', ADMIN_SURFACE, 'hover:bg-[#F1F5F9] transition-colors duration-150')}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 5: Live-verify**

Navigate to `http://localhost:8080/app/super-admin`. Confirm: light cards,
neutral navy icon chips (no per-metric rainbow tints), numbers in dark
slate, Recent Landlords row renders with a teal avatar circle.

- [ ] **Step 6: Commit**

```bash
git add src/pages/super-admin/SuperAdminDashboard.tsx
git commit -m "redesign: re-theme dashboard to light theme, remove per-metric tint chips"
```

---

### Task 4: CSV export utility

**Files:**
- Create: `src/lib/csvExport.ts`
- Test: `src/lib/csvExport.test.ts`

**Interfaces:**
- Produces:
  - `interface CsvColumn<T> { header: string; accessor: (row: T) => string | number }`
  - `rowsToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string`
  - `downloadCsv(filename: string, csvContent: string): void`
- Consumed by: Task 6 (`DataTable`), Tasks 9–11 (per-page `csvColumns`
  arrays).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/csvExport.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rowsToCsv } from './csvExport';

interface Row {
  name: string;
  amount: number;
  note: string;
}

describe('rowsToCsv', () => {
  const columns = [
    { header: 'Name', accessor: (r: Row) => r.name },
    { header: 'Amount', accessor: (r: Row) => r.amount },
    { header: 'Note', accessor: (r: Row) => r.note },
  ];

  it('writes a header row followed by one row per input', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Jane Doe', amount: 500, note: 'ok' }],
      columns
    );
    expect(csv).toBe('Name,Amount,Note\r\nJane Doe,500,ok');
  });

  it('returns only the header row for an empty input array', () => {
    const csv = rowsToCsv<Row>([], columns);
    expect(csv).toBe('Name,Amount,Note');
  });

  it('quotes and escapes a field containing a comma', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Doe, Jane', amount: 1, note: '' }],
      columns
    );
    expect(csv).toContain('"Doe, Jane"');
  });

  it('quotes and escapes a field containing a double quote', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Jane "JJ" Doe', amount: 1, note: '' }],
      columns
    );
    expect(csv).toContain('"Jane ""JJ"" Doe"');
  });

  it('quotes and escapes a field containing an embedded newline', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Jane Doe', amount: 1, note: 'line1\nline2' }],
      columns
    );
    expect(csv).toContain('"line1\nline2"');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/lib/csvExport.test.ts
```
Expected: FAIL — `csvExport` module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/csvExport.ts`:

```ts
export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

const escapeCsvField = (value: string | number): string => {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const rowsToCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.accessor(row))).join(',')
  );
  return [header, ...lines].join('\r\n');
};

// Triggers a browser download of the given CSV content. No prior
// Blob-download pattern exists elsewhere in this codebase — this is the
// first use of the Blob + createObjectURL + temporary <a download> pattern.
export const downloadCsv = (filename: string, csvContent: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/lib/csvExport.test.ts
```
Expected: PASS, all 5 tests.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/csvExport.ts src/lib/csvExport.test.ts
git commit -m "feat: add CSV export utility for super-admin data tables"
```

---

### Task 5: Persisted table-view-state storage utility

**Files:**
- Create: `src/lib/tableViewStorage.ts`
- Test: `src/lib/tableViewStorage.test.ts`

**Interfaces:**
- Produces:
  - `type StorageLike = Pick<Storage, 'getItem' | 'setItem'>`
  - `loadViewState<T>(storage: StorageLike, key: string, fallback: T): T`
  - `saveViewState<T>(storage: StorageLike, key: string, state: T): void`
- Consumed by: Task 6's wrapper hook (`useTableViewState`, defined inline
  in that task — this task only produces the pure, injectable-storage
  functions so they're testable without a real `localStorage`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tableViewStorage.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { loadViewState, saveViewState, StorageLike } from './tableViewStorage';

const makeMemoryStorage = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

describe('saveViewState / loadViewState', () => {
  it('round-trips a saved value', () => {
    const storage = makeMemoryStorage();
    saveViewState(storage, 'my-key', { search: 'abc', count: 3 });
    const result = loadViewState(storage, 'my-key', { search: '', count: 0 });
    expect(result).toEqual({ search: 'abc', count: 3 });
  });

  it('returns the fallback when nothing is stored', () => {
    const storage = makeMemoryStorage();
    const fallback = { search: '', count: 0 };
    expect(loadViewState(storage, 'missing-key', fallback)).toEqual(fallback);
  });

  it('returns the fallback when the stored value is corrupt JSON', () => {
    const storage = makeMemoryStorage();
    storage.data['bad-key'] = '{not json';
    const fallback = { search: '', count: 0 };
    expect(loadViewState(storage, 'bad-key', fallback)).toEqual(fallback);
  });

  it('returns the fallback without throwing when getItem throws', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {},
    };
    const fallback = { search: '', count: 0 };
    expect(() => loadViewState(storage, 'any-key', fallback)).not.toThrow();
    expect(loadViewState(storage, 'any-key', fallback)).toEqual(fallback);
  });

  it('does not throw when setItem throws (quota exceeded, private mode)', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(() => saveViewState(storage, 'any-key', { a: 1 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/lib/tableViewStorage.test.ts
```
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/tableViewStorage.ts`:

```ts
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const loadViewState = <T>(storage: StorageLike, key: string, fallback: T): T => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
};

export const saveViewState = <T>(storage: StorageLike, key: string, state: T): void => {
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {
    // Private browsing, storage disabled, or quota exceeded — the table
    // just falls back to session-only (unsaved) view state.
  }
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/lib/tableViewStorage.test.ts
```
Expected: PASS, all 5 tests.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tableViewStorage.ts src/lib/tableViewStorage.test.ts
git commit -m "feat: add injectable-storage persisted view-state utility"
```

---

### Task 6: Shared `DataTable` component + `useTableViewState` hook

**Files:**
- Create: `src/hooks/useTableViewState.ts`
- Create: `src/components/super-admin/DataTable.tsx`

**Interfaces:**
- Consumes: `loadViewState`/`saveViewState`/`StorageLike` (Task 5),
  `rowsToCsv`/`downloadCsv`/`CsvColumn` (Task 4), `@tanstack/react-table`
  (Task 1).
- Produces:
  - `interface TableViewState { search: string; statusFilter: string; sorting: SortingState; columnVisibility: VisibilityState }`
  - `useTableViewState(storageKey: string): { search: string; setSearch: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void; sorting: SortingState; setSorting: (v: SortingState) => void; columnVisibility: VisibilityState; setColumnVisibility: (v: VisibilityState) => void }`
  - `<DataTable<TData> columns={ColumnDef<TData>[]} data={TData[]} sorting={SortingState} onSortingChange={(s: SortingState) => void} columnVisibility={VisibilityState} onColumnVisibilityChange={(v: VisibilityState) => void} csvColumns={CsvColumn<TData>[]} csvFilename={string} isLoading?={boolean} loadingRowCount?={number} emptyMessage={string} footer?={React.ReactNode} />`
- Consumed by: Tasks 9, 10, 11 (Landlords, Payments, Onboarding Requests
  pages).

- [ ] **Step 1: Create `src/hooks/useTableViewState.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/components/super-admin/DataTable.tsx`**

```tsx
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
          onClick={() => downloadCsv(csvFilename, rowsToCsv(data, csvColumns))}
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
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-6 w-full bg-[#E2E8F0]" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-[#64748B]">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
```

Note: `column.getCanHide()` returns `false` for any column defined with
`enableHiding: false` — the per-page column definitions in Tasks 9–11 set
this on their Actions column, which is how Review Focus item 5 is
satisfied (there's no separate test for `DataTable` itself since it has no
DOM-testing infra available in this repo; the guarantee is structural —
`getCanHide()` is a `@tanstack/react-table` library behavior, not custom
logic this plan owns).

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean. (Not yet used by any page, so this only confirms the
component itself compiles.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTableViewState.ts src/components/super-admin/DataTable.tsx
git commit -m "feat: add shared DataTable component and persisted view-state hook"
```

---

### Task 7: Two new "Needs Attention" count hooks

**Files:**
- Modify: `src/hooks/useSuperAdminData.ts`

**Interfaces:**
- Consumes: nothing new (same `supabase` client, same `useQuery` pattern
  already used by `useNewOnboardingRequestsCount` in this file).
- Produces: `useFailedEmailLogsCount(): UseQueryResult<number>`,
  `useUnprocessedWebhooksCount(): UseQueryResult<number>`.
- Consumed by: Task 8 (`NeedsAttentionCard`).

- [ ] **Step 1: Add the two hooks**

Open `src/hooks/useSuperAdminData.ts`. Immediately after the existing
`useNewOnboardingRequestsCount` export (ends around line 546 — search for
`export const useNewOnboardingRequestsCount`), add:

```ts
// Hook to fetch the platform-wide count of bank-email parses that failed
// (email_logs.status === 'failed'), for the dashboard's Needs Attention
// widget. Independent useQuery (not folded into a combined hook) so one
// signal failing doesn't blank the others on the dashboard.
export const useFailedEmailLogsCount = () => {
  return useQuery({
    queryKey: ['needs-attention-failed-email-logs-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      if (error) throw error;
      return count || 0;
    },
  });
};

// Hook to fetch the platform-wide count of webhook deliveries that never
// finished processing (webhooks_log.processed === false), for the
// dashboard's Needs Attention widget.
export const useUnprocessedWebhooksCount = () => {
  return useQuery({
    queryKey: ['needs-attention-unprocessed-webhooks-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('webhooks_log')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false);

      if (error) throw error;
      return count || 0;
    },
  });
};
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSuperAdminData.ts
git commit -m "feat: add failed-email-parse and unprocessed-webhook count hooks"
```

---

### Task 8: "Needs Attention" dashboard widget

**Files:**
- Create: `src/components/super-admin/NeedsAttentionCard.tsx`
- Modify: `src/pages/super-admin/SuperAdminDashboard.tsx`

**Interfaces:**
- Consumes: `useFailedEmailLogsCount`, `useUnprocessedWebhooksCount`
  (Task 7); `PlatformStats` shape (`unmatchedPayments`,
  `expiringSubscriptions` fields) already returned by the existing
  `usePlatformStats()` hook, passed in as a prop rather than re-queried.
  `ADMIN_CARD` (Task 2). `ROUTES.SUPER_ADMIN_PAYMENTS`,
  `ROUTES.SUPER_ADMIN_LANDLORDS` from `@/lib/routes`.
- Produces: `<NeedsAttentionCard stats={PlatformStats | undefined} />`
  default export, rendered once from `SuperAdminDashboard`.

- [ ] **Step 1: Create `src/components/super-admin/NeedsAttentionCard.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronRight, CircleCheck, Mail, Webhook, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useFailedEmailLogsCount,
  useUnprocessedWebhooksCount,
  type PlatformStats,
} from '@/hooks/useSuperAdminData';
import { ADMIN_CARD, ADMIN_SURFACE } from '@/lib/adminStatusColors';
import { ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface FailedEmailRow {
  id: string;
  landlord_id: string;
  raw_message: string;
  error_message: string | null;
  created_at: string;
}

const useFailedEmailLogsList = (open: boolean) =>
  useQuery({
    queryKey: ['needs-attention-failed-email-logs-list'],
    queryFn: async (): Promise<FailedEmailRow[]> => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, landlord_id, raw_message, error_message, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

interface UnprocessedWebhookRow {
  id: string;
  webhook_type: string;
  endpoint: string;
  error_message: string | null;
  response_status: number | null;
  created_at: string;
}

const useUnprocessedWebhooksList = (open: boolean) =>
  useQuery({
    queryKey: ['needs-attention-unprocessed-webhooks-list'],
    queryFn: async (): Promise<UnprocessedWebhookRow[]> => {
      const { data, error } = await supabase
        .from('webhooks_log')
        .select('id, webhook_type, endpoint, error_message, response_status, created_at')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

const NeedsAttentionCard = ({ stats }: { stats: PlatformStats | undefined }) => {
  const navigate = useNavigate();
  const { data: failedEmailCount } = useFailedEmailLogsCount();
  const { data: unprocessedWebhookCount } = useUnprocessedWebhooksCount();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const { data: failedEmails, isLoading: failedEmailsLoading } =
    useFailedEmailLogsList(emailDialogOpen);
  const { data: unprocessedWebhooks, isLoading: unprocessedWebhooksLoading } =
    useUnprocessedWebhooksList(webhookDialogOpen);

  const items = [
    {
      key: 'unmatched-payments',
      count: stats?.unmatchedPayments ?? 0,
      label: 'unmatched payment(s) — review payment matching',
      onClick: () => navigate(`${ROUTES.SUPER_ADMIN_PAYMENTS}?tab=unmatched`),
    },
    {
      key: 'failed-emails',
      count: failedEmailCount ?? 0,
      label: 'bank email(s) failed to parse',
      onClick: () => setEmailDialogOpen(true),
    },
    {
      key: 'unprocessed-webhooks',
      count: unprocessedWebhookCount ?? 0,
      label: 'webhook callback(s) never finished processing',
      onClick: () => setWebhookDialogOpen(true),
    },
    {
      key: 'expiring-subscriptions',
      count: stats?.expiringSubscriptions ?? 0,
      label: 'subscription(s) expiring within 7 days',
      onClick: () => navigate(ROUTES.SUPER_ADMIN_LANDLORDS),
    },
  ].filter((item) => item.count > 0);

  return (
    <>
      <Card className={ADMIN_CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">
            Needs Attention
          </CardTitle>
          <CardDescription className="text-[#64748B]">
            Platform issues an admin should act on
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex items-center gap-2 text-[#0F766E] py-2">
              <CircleCheck className="h-4 w-4" />
              <span className="text-sm font-medium">All clear</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'w-full flex items-center justify-between p-3 text-left',
                    ADMIN_SURFACE,
                    'hover:bg-[#F1F5F9] transition-colors duration-150'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-[#0F172A]">
                      <span className="font-semibold">{item.count}</span> {item.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#64748B] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Failed bank-email parses
            </DialogTitle>
            <DialogDescription>
              Most recent 50 emails that failed automatic parsing
            </DialogDescription>
          </DialogHeader>
          {failedEmailsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !failedEmails || failedEmails.length === 0 ? (
            <p className="text-sm text-[#64748B] py-4">No failed parses.</p>
          ) : (
            <div className="space-y-2">
              {failedEmails.map((row) => (
                <div key={row.id} className={cn('p-3', ADMIN_SURFACE)}>
                  <p className="text-xs text-[#64748B]">{formatDateTime(row.created_at)}</p>
                  <p className="text-sm text-[#0F172A] mt-1 font-mono break-all">
                    {row.raw_message.slice(0, 160)}
                  </p>
                  {row.error_message && (
                    <p className="text-xs text-destructive mt-1">{row.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Unprocessed webhook callbacks
            </DialogTitle>
            <DialogDescription>
              Most recent 50 webhook deliveries still marked unprocessed
            </DialogDescription>
          </DialogHeader>
          {unprocessedWebhooksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !unprocessedWebhooks || unprocessedWebhooks.length === 0 ? (
            <p className="text-sm text-[#64748B] py-4">No unprocessed webhooks.</p>
          ) : (
            <div className="space-y-2">
              {unprocessedWebhooks.map((row) => (
                <div key={row.id} className={cn('p-3', ADMIN_SURFACE)}>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(row.created_at)}
                  </div>
                  <p className="text-sm text-[#0F172A] mt-1">
                    {row.webhook_type} → {row.endpoint}
                    {row.response_status ? ` (HTTP ${row.response_status})` : ''}
                  </p>
                  {row.error_message && (
                    <p className="text-xs text-destructive mt-1">{row.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NeedsAttentionCard;
```

- [ ] **Step 2: Wire it into the dashboard**

In `src/pages/super-admin/SuperAdminDashboard.tsx`:

Add the import near the other component imports:
```ts
import NeedsAttentionCard from '@/components/super-admin/NeedsAttentionCard';
```

Insert `<NeedsAttentionCard stats={stats} />` immediately after the closing
`</div>` of the "Secondary Stats" grid and before the `{/* Recent Landlords */}`
comment — i.e. between the two existing sections, at the same indentation
level as the stats grids and the Recent Landlords `<Card>`.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 4: Live-verify**

Navigate to `http://localhost:8080/app/super-admin`. Confirm the Needs
Attention card renders. If the platform currently has 0 for all four
signals, confirm the "All clear" state renders instead of an empty
section. If any signal is non-zero (this session's dev data has 12
unmatched payments, per prior verification in this same project), confirm
clicking its row navigates/opens correctly — clicking the unmatched-
payments row should land on the Payments page with the Unmatched tab
active (this will only fully work once Task 10 reads the `?tab=` param —
until then, confirm it navigates to the right URL even if the tab doesn't
yet auto-select).

- [ ] **Step 5: Commit**

```bash
git add src/components/super-admin/NeedsAttentionCard.tsx src/pages/super-admin/SuperAdminDashboard.tsx
git commit -m "feat: add Needs Attention widget to super-admin dashboard"
```

---

### Task 9: Convert Landlords page to light theme + DataTable

**Files:**
- Modify: `src/pages/super-admin/LandlordsPage.tsx`

**Interfaces:**
- Consumes: `DataTable`, `useTableViewState` (Task 6); `CsvColumn` type
  (Task 4, imported transitively via `DataTable`'s prop type — also
  imported directly here for the `csvColumns` array's type annotation).
- Produces: no new exports — default export unchanged in shape.

- [ ] **Step 1: Update imports**

Replace the full import block at the top of the file with:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useLandlords, useUpdateLandlordStatus, useSubscriptionPlans, useAssignSubscription, useAllocateSmsTokens, useUpdateInboundEmail } from '@/hooks/useSuperAdminData';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Search, MoreVertical, UserPlus, Eye, Ban, CheckCircle, CreditCard, MessageSquare, LogIn, Building2, Users, Home, Mail } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dates';
import type { LandlordProfile } from '@/hooks/useSuperAdminData';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';
```

(`ADMIN_SURFACE` and `Skeleton` are dropped — `DataTable` owns its own
loading/empty rendering now; `MoreVertical` stays, used by the new row
Actions menu.)

- [ ] **Step 2: Replace the search-state and filtering block**

Replace:
```tsx
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordProfile | null>(null);
```
with:
```tsx
  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
  } = useTableViewState('super-admin-landlords');
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordProfile | null>(null);
```

- [ ] **Step 3: Re-theme the header, filters, and list-card shell**

Replace:
```tsx
            <h1 className="text-2xl font-semibold tracking-tight text-white">Landlord Management</h1>
            <p className="text-slate-400">Manage landlord accounts and subscriptions</p>
```
with:
```tsx
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Landlord Management</h1>
            <p className="text-[#64748B]">Manage landlord accounts and subscriptions</p>
```

Replace:
```tsx
            <Button asChild variant="outline" className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
```
with:
```tsx
            <Button asChild variant="outline" className="border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]">
```

Replace:
```tsx
                <Input
                  placeholder="Search by name, company, or phone..."
                  className="pl-10 bg-white/[0.04] border-white/10 text-white"
```
with:
```tsx
                <Input
                  placeholder="Search by name, company, or phone..."
                  className="pl-10"
```
(inputs don't need theme overrides anymore — the default shadcn `Input`
already renders correctly on a light page; the dark theme needed the
override, the light theme doesn't.)

Replace:
```tsx
                <SelectTrigger className="w-full sm:w-48 bg-white/[0.04] border-white/10 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#121a2e] border-white/10">
```
with:
```tsx
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
```

- [ ] **Step 4: Replace the entire "Landlords List" card body with a
  `DataTable`**

Delete the whole `{/* Landlords List */}` `<Card>` block (from
`<Card className={ADMIN_CARD}>` through its matching `</Card>`, i.e. the
block containing the `isLoading`/`filteredLandlords?.length === 0`/
card-stack `.map(...)`) and replace it with:

```tsx
        {/* Landlords Table */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Landlords ({filteredLandlords?.length || 0})</CardTitle>
            <CardDescription className="text-[#64748B]">
              All registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<LandlordProfile>
              columns={columns}
              data={filteredLandlords || []}
              sorting={sorting}
              onSortingChange={setSorting}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              csvColumns={csvColumns}
              csvFilename="kodipap-landlords.csv"
              isLoading={isLoading}
              emptyMessage="No landlords found"
            />
          </CardContent>
        </Card>
```

- [ ] **Step 5: Add the `columns` and `csvColumns` definitions**

Immediately before the `return (` statement (i.e. after `getStatusBadgeColor`
and before `return (\n    <SuperAdminLayout>`), add:

```tsx
  const columns = useMemo<ColumnDef<LandlordProfile>[]>(
    () => [
      {
        id: 'Landlord',
        accessorFn: (row) => row.full_name || '',
        header: 'Landlord',
        cell: ({ row }) => {
          const landlord = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
                <span className="text-[#0F766E] font-semibold text-sm">
                  {landlord.full_name?.[0] || 'L'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[#0F172A] truncate">{landlord.full_name || 'Unknown'}</p>
                <p className="text-xs text-[#64748B] truncate">{landlord.company_name || 'No company'}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'Phone',
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => row.original.phone || 'No phone',
      },
      {
        id: 'Status',
        accessorKey: 'account_status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline" className={getStatusBadgeColor(row.original.account_status)}>
            {row.original.account_status}
          </Badge>
        ),
      },
      {
        id: 'Subscription',
        accessorFn: (row) => row.subscription?.plan_name || '',
        header: 'Subscription',
        cell: ({ row }) => row.original.subscription?.plan_name || 'No subscription',
      },
      {
        id: 'SMS Balance',
        accessorKey: 'sms_token_balance',
        header: 'SMS Balance',
      },
      {
        id: 'Joined',
        accessorKey: 'created_at',
        header: 'Joined',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: 'Actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const landlord = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90">
                    <LogIn className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord)}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord, ROUTES.PROPERTIES)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Add Property
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord, ROUTES.HOUSES)}>
                    <Home className="h-4 w-4 mr-2" />
                    Add House
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord, ROUTES.TENANTS)}>
                    <Users className="h-4 w-4 mr-2" />
                    Add Tenant
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setDialogType('view');
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setDialogType('subscription');
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Assign Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setDialogType('sms');
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Allocate SMS Tokens
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setInboundEmailInput(landlord.inbound_email || '');
                      setDialogType('inboundEmail');
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Edit Inbound Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {landlord.account_status !== 'active' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(landlord.id, 'active')}>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Activate Account
                    </DropdownMenuItem>
                  )}
                  {landlord.account_status !== 'suspended' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(landlord.id, 'suspended')}>
                      <Ban className="h-4 w-4 mr-2 text-red-600" />
                      Suspend Account
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleLoginAs, handleStatusChange]
  );

  const csvColumns: CsvColumn<LandlordProfile>[] = [
    { header: 'Name', accessor: (r) => r.full_name ?? '' },
    { header: 'Company', accessor: (r) => r.company_name ?? '' },
    { header: 'Phone', accessor: (r) => r.phone ?? '' },
    { header: 'Status', accessor: (r) => r.account_status },
    { header: 'Subscription', accessor: (r) => r.subscription?.plan_name ?? '' },
    { header: 'SMS Balance', accessor: (r) => r.sms_token_balance },
    { header: 'Joined', accessor: (r) => r.created_at },
  ];
```

- [ ] **Step 6: Re-theme the four remaining dialogs**

In the four `<Dialog>` blocks below the table (View Details, Assign
Subscription, Edit Inbound Email, Allocate SMS), apply the canonical
token-table swaps from Global Constraints: every `bg-[#121a2e] border-
white/10 text-white` → delete entirely (shadcn's default `DialogContent`
styling is already light-theme-correct, same reasoning as the `Input`
change in Step 3), every `text-slate-400` → `text-[#64748B]`, every
`text-slate-200` → delete (default label color is already correct), every
`text-white` → delete, every `bg-white/[0.04] border-white/10` (input
overrides) → delete, every `bg-[#121a2e] border-white/10` (nested
`SelectContent`) → delete, the `className={cn("p-4", ADMIN_SURFACE)}`
balance box stays as-is (`ADMIN_SURFACE` is already re-themed by Task 2),
and the three `className="bg-transparent border-white/10 text-slate-300
hover:bg-white/10 hover:text-white"` Cancel buttons → `className="border-
[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]"`.

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 8: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/landlords`. Confirm:
light-themed table renders with sortable column headers, Columns dropdown
hides/shows every column except Actions, Export CSV downloads a valid
file, every existing action still works (View Details, Login as Landlord,
Assign Subscription, Allocate SMS, Edit Inbound Email, Activate/Suspend,
Add Landlord, View Onboarding Requests link) — exercise at least Assign
Subscription and Allocate SMS end-to-end since those have real mutations,
then revert any test value written. Reload the page and confirm the
search box and column-visibility choice persisted.

- [ ] **Step 9: Commit**

```bash
git add src/pages/super-admin/LandlordsPage.tsx
git commit -m "redesign: convert Landlords page to light theme + DataTable"
```

---

### Task 10: Convert Payments page to light theme + DataTable + `?tab=` param

**Files:**
- Modify: `src/pages/super-admin/GlobalPaymentsPage.tsx`

**Interfaces:**
- Consumes: `DataTable`, `useTableViewState` (Task 6).
- Produces: no new exports — default export unchanged in shape. Reads
  `?tab=` from the URL via `useSearchParams` (react-router, already a
  project dependency).

- [ ] **Step 1: Update imports**

Replace the top of the file through the `interface Payment` block with:

```tsx
import { useMemo, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertTriangle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dates';
import { PaymentStatementUploadDialog } from '@/components/payments/PaymentStatementUploadDialog';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD } from '@/lib/adminStatusColors';

interface Payment {
  id: string;
  amount: number;
  mpesa_ref: string;
  payment_date: string;
  sender_name: string | null;
  sender_phone: string | null;
  tenant_id: string | null;
  house_id: string | null;
  landlord_id: string;
  created_at: string;
}
```

(`Skeleton`, `DollarSign`, `cn`, `ADMIN_SURFACE` are dropped — no longer
used once the card-stack `PaymentsList` is replaced by `DataTable`.)

- [ ] **Step 2: Read the `?tab=` query param and wire the two tables'
  view state**

Replace:
```tsx
const GlobalPaymentsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<string>('');
```
with:
```tsx
const GlobalPaymentsPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'unmatched' ? 'unmatched' : 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<string>('');
  const allView = useTableViewState('super-admin-payments-all');
  const unmatchedView = useTableViewState('super-admin-payments-unmatched');
```

(This page's `searchQuery` stays a plain `useState` rather than routing
through `useTableViewState`, since one search box filters both tabs and
`useTableViewState` is scoped per-table below for sort/column-visibility
only — persisting a shared search box under two different storage keys
would desync; the simpler plain-`useState` behavior here matches what the
page already had.)

- [ ] **Step 3: Delete the `PaymentsList` component and the empty-state
  import it needed**

Delete the entire `const PaymentsList = ({ payments }: { payments:
Payment[] }) => ( ... );` block.

- [ ] **Step 4: Add the shared `columns` and `csvColumns` definitions**

Immediately after the `landlordNameById` map definition (which stays
unchanged) and the `filteredPayments` function (which also stays
unchanged), add:

```tsx
  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        id: 'Amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => `KES ${row.original.amount.toLocaleString()}`,
      },
      {
        id: 'Ref',
        accessorKey: 'mpesa_ref',
        header: 'M-Pesa Ref',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.original.mpesa_ref}
          </Badge>
        ),
      },
      {
        id: 'Sender',
        accessorFn: (row) => row.sender_name || '',
        header: 'Sender',
        cell: ({ row }) => (
          <div>
            <p className="text-[#0F172A]">{row.original.sender_name || 'Unknown'}</p>
            <p className="text-xs text-[#64748B]">{row.original.sender_phone || 'No phone'}</p>
          </div>
        ),
      },
      {
        id: 'Landlord',
        accessorFn: (row) => landlordNameById.get(row.landlord_id) || 'Unknown landlord',
        header: 'Landlord',
      },
      {
        id: 'Date',
        accessorKey: 'payment_date',
        header: 'Date',
        cell: ({ row }) => (
          <div>
            <p>{formatDate(row.original.payment_date)}</p>
            <p className="text-xs text-[#64748B]">
              {format(new Date(row.original.payment_date), 'HH:mm')}
            </p>
          </div>
        ),
      },
      {
        id: 'Status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) =>
          !row.original.tenant_id || !row.original.house_id ? (
            <Badge variant="outline" className={STATUS_BADGE_CLASSES.warning}>
              Unmatched
            </Badge>
          ) : (
            <Badge variant="outline" className={STATUS_BADGE_CLASSES.success}>
              Matched
            </Badge>
          ),
      },
    ],
    [landlordNameById]
  );

  const csvColumns: CsvColumn<Payment>[] = [
    { header: 'Amount', accessor: (p) => p.amount },
    { header: 'M-Pesa Ref', accessor: (p) => p.mpesa_ref },
    { header: 'Sender Name', accessor: (p) => p.sender_name ?? '' },
    { header: 'Sender Phone', accessor: (p) => p.sender_phone ?? '' },
    { header: 'Landlord', accessor: (p) => landlordNameById.get(p.landlord_id) ?? 'Unknown landlord' },
    { header: 'Date', accessor: (p) => p.payment_date },
    {
      header: 'Status',
      accessor: (p) => (!p.tenant_id || !p.house_id ? 'Unmatched' : 'Matched'),
    },
  ];
```

- [ ] **Step 5: Replace the two `<TabsContent>` bodies**

Replace the `<Tabs defaultValue="all" ...>` opening tag with
`<Tabs defaultValue={initialTab} className="space-y-4">` (using the
`initialTab` computed in Step 2 instead of the hardcoded `"all"`).

Replace the full `<TabsContent value="all">...</TabsContent>` block's
`<CardContent>` body (the `isLoading ? ... : <><PaymentsList .../>
{hasNextPage && (...)}</>` part) with:

```tsx
              <CardContent>
                <DataTable<Payment>
                  columns={columns}
                  data={filteredPayments(allPayments)}
                  sorting={allView.sorting}
                  onSortingChange={allView.setSorting}
                  columnVisibility={allView.columnVisibility}
                  onColumnVisibilityChange={allView.setColumnVisibility}
                  csvColumns={csvColumns}
                  csvFilename="kodipap-payments-all.csv"
                  isLoading={isLoading}
                  emptyMessage="No payments found"
                  footer={
                    hasNextPage ? (
                      <Button
                        variant="outline"
                        className="w-full border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? 'Loading…' : 'Load more'}
                      </Button>
                    ) : undefined
                  }
                />
              </CardContent>
```

Apply the identical replacement to the `<TabsContent value="unmatched">`
block's `<CardContent>` body, with these differences: `data={filteredPayments(unmatchedPayments)}`,
`sorting={unmatchedView.sorting}`, `onSortingChange={unmatchedView.setSorting}`,
`columnVisibility={unmatchedView.columnVisibility}`,
`onColumnVisibilityChange={unmatchedView.setColumnVisibility}`,
`csvFilename="kodipap-payments-unmatched.csv"`.

- [ ] **Step 6: Re-theme the remaining page chrome**

Apply the Global Constraints token table to: the header (`text-white` →
`text-[#0F172A]`, `text-slate-400` → `text-[#64748B]`), the landlord-select
`SelectTrigger`/`SelectContent` (drop the dark overrides, same reasoning as
Task 9 Step 3), the search-card `Input` (drop the dark override), the
`TabsList`/`TabsTrigger` (`bg-[#121a2e] border-white/10` → delete, shadcn's
default `Tabs` styling is light-theme-correct; `data-[state=active]:bg-
white/10` → `data-[state=active]:bg-[#F1F5F9]`).

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 8: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/payments` — confirm
"All" tab is active by default. Then navigate to
`http://localhost:8080/app/super-admin/payments?tab=unmatched` — confirm
the Unmatched tab is active on load. Confirm both tables sort, export CSV,
and "Load more" still works. Confirm the Needs Attention widget's
unmatched-payments row (Task 8) now correctly lands on the Unmatched tab.

- [ ] **Step 9: Commit**

```bash
git add src/pages/super-admin/GlobalPaymentsPage.tsx
git commit -m "redesign: convert Payments page to light theme + DataTable, read ?tab= param"
```

---

### Task 11: Convert Onboarding Requests page to light theme + DataTable

**Files:**
- Modify: `src/pages/super-admin/OnboardingRequestsPage.tsx`

**Interfaces:**
- Consumes: `DataTable`, `useTableViewState` (Task 6).
- Produces: no new exports — default export unchanged in shape.

- [ ] **Step 1: Update imports**

Replace the top of the file through `const STATUS_OPTIONS` with:

```tsx
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useOnboardingRequests, useUpdateOnboardingStatus } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Phone, Mail, Check, X, PhoneCall, UserPlus, MoreVertical } from 'lucide-react';
import { formatDateTime } from '@/lib/dates';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import type { OnboardingRequest } from '@/hooks/useSuperAdminData';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD } from '@/lib/adminStatusColors';

const STATUS_OPTIONS = ['new', 'contacted', 'converted', 'dismissed'];
```

(`Skeleton`, `Button`, `cn`, `ADMIN_SURFACE` drop out — `Button` is no
longer used directly since the four inline action buttons move into a
`DropdownMenu`.)

- [ ] **Step 2: Replace the search/filter state**

Replace:
```tsx
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createAccountFor, setCreateAccountFor] = useState<OnboardingRequest | null>(null);
```
with:
```tsx
  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
  } = useTableViewState('super-admin-onboarding-requests');
  const [createAccountFor, setCreateAccountFor] = useState<OnboardingRequest | null>(null);
```

- [ ] **Step 3: Add the `columns` and `csvColumns` definitions**

Immediately before `return (`, add:

```tsx
  const columns = useMemo<ColumnDef<OnboardingRequest>[]>(
    () => [
      { id: 'Name', accessorKey: 'full_name', header: 'Name' },
      { id: 'Email', accessorKey: 'email', header: 'Email' },
      { id: 'Phone', accessorKey: 'phone', header: 'Phone' },
      {
        id: 'Plan',
        accessorKey: 'plan',
        header: 'Plan',
        cell: ({ row }) => (
          <Badge variant="outline" className="border-[#0F766E]/40 text-[#0F766E]">
            {row.original.plan}
          </Badge>
        ),
      },
      {
        id: 'Status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline" className={getStatusBadgeColor(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: 'Created',
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: 'Actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const request = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="p-1.5 rounded hover:bg-[#F1F5F9]">
                  <MoreVertical className="h-4 w-4 text-[#64748B]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {request.status === 'new' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'contacted')}>
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Mark contacted
                  </DropdownMenuItem>
                )}
                {request.status !== 'converted' && (
                  <DropdownMenuItem onClick={() => setCreateAccountFor(request)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create account
                  </DropdownMenuItem>
                )}
                {request.status !== 'converted' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'converted')}>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Mark converted
                  </DropdownMenuItem>
                )}
                {request.status !== 'dismissed' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'dismissed')}>
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Dismiss
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleStatusChange]
  );

  const csvColumns: CsvColumn<OnboardingRequest>[] = [
    { header: 'Name', accessor: (r) => r.full_name },
    { header: 'Email', accessor: (r) => r.email },
    { header: 'Phone', accessor: (r) => r.phone },
    { header: 'Plan', accessor: (r) => r.plan },
    { header: 'Status', accessor: (r) => r.status },
    { header: 'Created', accessor: (r) => r.created_at },
  ];
```

- [ ] **Step 4: Replace the "Requests List" card body**

Delete the whole card-stack `{filteredRequests?.map((request) => (...))}`
block (inside the `{/* Requests List */}` `<Card>`) and replace the
`<CardContent>` body with:

```tsx
          <CardContent>
            <DataTable<OnboardingRequest>
              columns={columns}
              data={filteredRequests || []}
              sorting={sorting}
              onSortingChange={setSorting}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              csvColumns={csvColumns}
              csvFilename="kodipap-onboarding-requests.csv"
              isLoading={isLoading}
              emptyMessage="No onboarding requests found"
            />
          </CardContent>
```

- [ ] **Step 5: Re-theme the remaining page chrome**

Apply the Global Constraints token table to the header, filter card, and
search/select inputs — identical pattern to Task 9 Step 3.

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 7: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/onboarding-requests`.
Confirm the table renders, the Actions `...` menu shows the correct
conditional items per row status, Export CSV works, and the "Create
account" flow (opens `CreateLandlordDialog`) still works end-to-end.

- [ ] **Step 8: Commit**

```bash
git add src/pages/super-admin/OnboardingRequestsPage.tsx
git commit -m "redesign: convert Onboarding Requests page to light theme + DataTable"
```

---

### Task 12: Re-theme Subscriptions page (theme-only, no table conversion)

**Files:**
- Modify: `src/pages/super-admin/SubscriptionsPage.tsx`

**Interfaces:**
- Consumes: `ADMIN_CARD` (Task 2). No other new interfaces — this page
  keeps its 4-card plan-grid layout per the spec (a table is the wrong
  shape for 4 subscription-tier cards).

- [ ] **Step 1: Run the mechanical token replacement**

```bash
cd "/Users/admin/Desktop/Work/DM Hub/tenant-tracker-bot" && python3 - <<'EOF'
path = "src/pages/super-admin/SubscriptionsPage.tsx"
s = open(path).read()

# Specific multi-class strings first (most specific wins)
s = s.replace(
    'className="bg-[#121a2e] border-white/10 text-white max-h-[85vh] overflow-y-auto"',
    'className="max-h-[85vh] overflow-y-auto"')
s = s.replace(
    'className="bg-white/[0.04] border-white/10 min-h-[100px]"',
    'className="min-h-[100px]"')
s = s.replace('className="bg-white/[0.04] border-white/10"', 'className=""')
s = s.replace(
    'className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"',
    'className="border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]"')
s = s.replace('className="text-slate-200"', '')
s = s.replace(
    'className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10"',
    'className="h-7 w-7 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"')
s = s.replace("plan.name === 'Pro' && 'ring-2 ring-primary'", "plan.name === 'Pro' && 'ring-2 ring-[#0F766E]'")
s = s.replace('<Badge className="bg-primary">Popular</Badge>', '<Badge className="bg-[#0F766E]">Popular</Badge>')
s = s.replace('border-t border-white/10', 'border-t border-[#E2E8F0]')

# Generic catch-alls (run after the specific replacements above, since
# several of those specific strings contain these shorter substrings)
s = s.replace('text-2xl font-semibold tracking-tight text-white', 'text-2xl font-semibold tracking-tight text-[#0F172A]')
s = s.replace('text-lg font-semibold tracking-tight text-white', 'text-lg font-semibold tracking-tight text-[#0F172A]')
s = s.replace('text-3xl font-bold text-white', 'text-3xl font-bold text-[#0F172A]')
s = s.replace('bg-white/[0.06]', 'bg-[#E2E8F0]')
s = s.replace('text-slate-400', 'text-[#64748B]')
s = s.replace('text-slate-300', 'text-[#0F172A]')
s = s.replace('text-primary', 'text-[#0F766E]')

open(path, "w").write(s)
EOF
```

- [ ] **Step 2: Verify no dark-theme literals remain**

```bash
grep -n "slate-\|white/\|#121a2e\|text-white\b" src/pages/super-admin/SubscriptionsPage.tsx
```
Expected: no output (empty match). If anything prints, it's a literal this
script's replacements didn't cover — fix it inline with the same token
mapping from Global Constraints before continuing.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 4: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/subscriptions`. Confirm
all 4 plan cards render light-themed, the "Pro" card's teal ring and
"Popular" badge are visible, the pencil Edit button opens the
`EditPlanDialog` correctly themed (light dialog, readable inputs), and a
test edit (change a plan's description, save, revert) still works
end-to-end exactly as it did before this redesign.

- [ ] **Step 5: Commit**

```bash
git add src/pages/super-admin/SubscriptionsPage.tsx
git commit -m "redesign: re-theme Subscriptions page to light navy+teal theme"
```

---

### Task 13: Re-theme Properties page (theme-only, no table conversion)

**Files:**
- Modify: `src/pages/super-admin/PropertiesPage.tsx`

**Interfaces:**
- Consumes: `ADMIN_CARD`, `ADMIN_SURFACE` (Task 2). This page already uses
  a real `<Table>` on desktop (confirmed in the existing code) — it is not
  a candidate for the `DataTable` conversion in this plan since it has no
  sort/filter/column-visibility requirement in the spec; theme-only.

- [ ] **Step 1: Run the mechanical token replacement**

```bash
cd "/Users/admin/Desktop/Work/DM Hub/tenant-tracker-bot" && python3 - <<'EOF'
path = "src/pages/super-admin/PropertiesPage.tsx"
s = open(path).read()

s = s.replace(
    'className="pl-10 bg-white/[0.04] border-white/10 text-white"',
    'className="pl-10"')
s = s.replace('text-slate-700 mx-auto mb-3', 'text-[#CBD5E1] mx-auto mb-3')
s = s.replace('className="border-white/10 text-slate-300 capitalize"',
              'className="border-[#E2E8F0] text-[#1E3A5F] capitalize"')
s = s.replace(
    'className="flex gap-4 text-xs text-slate-400 pt-1 border-t border-white/10"',
    'className="flex gap-4 text-xs text-[#64748B] pt-1 border-t border-[#E2E8F0]"')
s = s.replace('className="border-white/10 hover:bg-transparent"',
              'className="border-[#E2E8F0] hover:bg-transparent"')
s = s.replace('className="border-white/10 hover:bg-white/[0.04]"',
              'className="border-[#E2E8F0] hover:bg-[#F8FAFC]"')

# Generic catch-alls
s = s.replace('text-2xl md:text-3xl font-bold tracking-tight text-white',
              'text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]')
s = s.replace('flex items-center gap-2 text-white', 'flex items-center gap-2 text-[#0F172A]')
s = s.replace('bg-white/[0.06]', 'bg-[#E2E8F0]')
s = s.replace('text-slate-400', 'text-[#64748B]')
s = s.replace('text-slate-200', 'text-[#0F172A]')
s = s.replace('font-semibold text-white', 'font-semibold text-[#0F172A]')
s = s.replace('font-medium text-white', 'font-medium text-[#0F172A]')

open(path, "w").write(s)
EOF
```

- [ ] **Step 2: Verify no dark-theme literals remain**

```bash
grep -n "slate-\|white/\|#121a2e\|text-white\b" src/pages/super-admin/PropertiesPage.tsx
```
Expected: no output.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 4: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/properties`. Confirm
both the mobile card layout and the desktop `<Table>` render light-themed
and legible.

- [ ] **Step 5: Commit**

```bash
git add src/pages/super-admin/PropertiesPage.tsx
git commit -m "redesign: re-theme Properties page to light navy+teal theme"
```

---

### Task 14: Re-theme Audit Logs page (theme-only, no table conversion)

**Files:**
- Modify: `src/pages/super-admin/AuditLogsPage.tsx`

**Interfaces:**
- Consumes: `ADMIN_CARD`, `ADMIN_SURFACE`, `STATUS_BADGE_CLASSES`
  (Task 2). Theme-only — per the spec, audit log entries are prose, not a
  tabular-columns candidate.

- [ ] **Step 1: Run the mechanical token replacement**

```bash
cd "/Users/admin/Desktop/Work/DM Hub/tenant-tracker-bot" && python3 - <<'EOF'
path = "src/pages/super-admin/AuditLogsPage.tsx"
s = open(path).read()

s = s.replace(
    'className="text-2xl font-semibold tracking-tight text-white"',
    'className="text-2xl font-semibold tracking-tight text-[#0F172A]"')
s = s.replace(
    'className="text-lg font-semibold tracking-tight text-white flex items-center gap-2"',
    'className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2"')
s = s.replace('text-slate-700 mx-auto mb-4', 'text-[#CBD5E1] mx-auto mb-4')
s = s.replace('className="w-2 h-2 rounded-full bg-primary mt-2"',
              'className="w-2 h-2 rounded-full bg-[#0F766E] mt-2"')

# Generic catch-alls
s = s.replace('bg-white/[0.06]', 'bg-[#E2E8F0]')
s = s.replace('text-slate-400', 'text-[#64748B]')
s = s.replace('text-slate-300', 'text-[#0F172A]')
s = s.replace('text-slate-500', 'text-[#64748B]')

open(path, "w").write(s)
EOF
```

- [ ] **Step 2: Verify no dark-theme literals remain**

```bash
grep -n "slate-\|white/\|#121a2e\|text-white\b" src/pages/super-admin/AuditLogsPage.tsx
```
Expected: no output.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 4: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/audit-logs`. Confirm
the activity log list renders light-themed and every status-tinted action
badge (CREATE/UPDATE/DELETE-style colors) is still clearly legible on the
white row background.

- [ ] **Step 5: Commit**

```bash
git add src/pages/super-admin/AuditLogsPage.tsx
git commit -m "redesign: re-theme Audit Logs page to light navy+teal theme"
```

---

### Task 15: Re-theme Settings page (theme-only, no table conversion)

**Files:**
- Modify: `src/pages/super-admin/SettingsPage.tsx`

**Interfaces:**
- Consumes: `ADMIN_CARD`, `ADMIN_SURFACE` (Task 2). Theme-only.

- [ ] **Step 1: Run the mechanical token replacement**

```bash
cd "/Users/admin/Desktop/Work/DM Hub/tenant-tracker-bot" && python3 - <<'EOF'
path = "src/pages/super-admin/SettingsPage.tsx"
s = open(path).read()

s = s.replace(
    'className="text-2xl font-semibold tracking-tight text-white"',
    'className="text-2xl font-semibold tracking-tight text-[#0F172A]"')
s = s.replace(
    'className="text-lg font-semibold tracking-tight text-white flex items-center gap-2"',
    'className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2"')
s = s.replace(
    'className="text-lg font-semibold tracking-tight text-white"',
    'className="text-lg font-semibold tracking-tight text-[#0F172A]"')
s = s.replace('className="text-slate-200"', '')
s = s.replace('className="text-white font-medium"', 'className="text-[#0F172A] font-medium"')
s = s.replace('className="text-white font-medium capitalize"',
              'className="text-[#0F172A] font-medium capitalize"')
s = s.replace('className="text-sm font-medium text-white"',
              'className="text-sm font-medium text-[#0F172A]"')
s = s.replace('className="h-4 w-4 text-primary"', 'className="h-4 w-4 text-[#0F766E]"')

# Generic catch-alls
s = s.replace('bg-white/[0.06]', 'bg-[#E2E8F0]')
s = s.replace('text-slate-400', 'text-[#64748B]')
s = s.replace('text-slate-300', 'text-[#0F172A]')

open(path, "w").write(s)
EOF
```

- [ ] **Step 2: Verify no dark-theme literals remain**

```bash
grep -n "slate-\|white/\|#121a2e\|text-white\b" src/pages/super-admin/SettingsPage.tsx
```
Expected: no output.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```
Expected: clean.

- [ ] **Step 4: Live-verify**

Navigate to `http://localhost:8080/app/super-admin/settings`. Confirm all
four cards (General, SMS Configuration, Security, All Settings) render
light-themed, the Maintenance Mode / Bank Email Parsing switches still
toggle and persist (existing mutation, exercise at least one and revert
it), and the RLS/RBAC indicator dots are still green and legible.

- [ ] **Step 5: Commit**

```bash
git add src/pages/super-admin/SettingsPage.tsx
git commit -m "redesign: re-theme Settings page to light navy+teal theme"
```

---

## Plan Self-Review

**Spec coverage:** Section 1 (theme tokens) → Tasks 2, 3, 9–15. Section 2
(Needs Attention) → Tasks 7, 8. Section 3 (data tables) → Tasks 1, 4, 5, 6,
9, 10, 11. The spec's architecture summary table is fully covered —
`SubscriptionsPage`/`PropertiesPage`/`AuditLogsPage`/`SettingsPage` theme-
only (Tasks 12–15), `LandlordsPage`/`GlobalPaymentsPage`/
`OnboardingRequestsPage` theme + table (Tasks 9–11). No spec requirement
without an owning task.

**Placeholder scan:** No TBD/TODO markers. Every step carries literal code,
literal before/after strings, or a literal runnable command — no "similar
to Task N" references, no steps that describe without showing.

**Type consistency:** `DataTable<TData>`'s prop names (`sorting`,
`onSortingChange`, `columnVisibility`, `onColumnVisibilityChange`,
`csvColumns`, `csvFilename`, `isLoading`, `loadingRowCount`,
`emptyMessage`, `footer`) are identical across Task 6's definition and
every call site in Tasks 9, 10, 11. `useTableViewState`'s return shape
(`search`/`setSearch`/`statusFilter`/`setStatusFilter`/`sorting`/
`setSorting`/`columnVisibility`/`setColumnVisibility`) is identical across
Task 6's definition and its three consumers. `CsvColumn<T>` (`header`,
`accessor`) is identical across Task 4's definition and every
`csvColumns` array in Tasks 9–11.

**Review Focus:** all five items (CSV escaping, localStorage failure,
independent Needs Attention signals, invalid `?tab=` param, non-hideable
Actions column) have an owning task with a concrete test or explicit
verification step, as listed in the Review Focus section above.

---

## Execution Handoff

Plan complete and saved to
`plans/2026-10-06-super-admin-fintech-redesign.md`. Please review the plan.
Which execution approach would you prefer?

- **Subagent-driven** — A fresh subagent implements each task and a fresh
  reviewer checks it before the next one starts, then a whole-branch
  review at the end. Most thorough; costs a fresh context per task and per
  review.
- **Native** — I implement every task myself in this session, the way
  this harness runs work, then one fresh reviewer on the most capable
  model checks the whole branch. Cheapest and fastest; no independent
  review until the end.

For this plan I recommend **Subagent-driven**, because 7 of the 15 tasks
(9–15) are mechanical-but-high-surface-area theme swaps across files I
won't re-read before writing each one, and Tasks 9–11 additionally
restructure real mutation-triggering UI (status changes, subscription
assignment, SMS allocation) — a fresh reviewer catching a dropped
`onClick` handler or a wrong `accessorFn` before the next task compounds
the mistake is worth more here than the cost of per-task review, given
this app's real money/tenant data runs through these pages. Does the plan
capture what you want, and which approach should we use?
