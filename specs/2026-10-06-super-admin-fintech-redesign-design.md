# Super-admin fintech-trust redesign

## Why

The super-admin area just shipped a dark "premium SaaS" visual pass (commit
`a8d8752`). The user's actual positioning for KODI PAP is "premium
property-management SaaS with fintech-level trust" — and for that register,
dark gradient panels read as a dev-tool/consumer-app aesthetic rather than
the calm, operational, trustworthy register of tools like Stripe, Brex, or
Mercury. This spec replaces that dark theme with a light navy+teal theme,
adds a real "what needs my attention" surface to the dashboard, and converts
the three list-heavy pages (Landlords, Payments, Onboarding Requests) from
card-stacks to dense, sortable data tables — the pattern that actually scales
past a handful of rows.

Success criteria: the area reads as a serious financial operations console
— dense, scannable, low-color, action-oriented — rather than a marketing
surface. Every existing feature (impersonation, subscription assignment, SMS
allocation, onboarding triage, plan editing, payment reconciliation view)
keeps working exactly as today; this is a presentation-layer and
information-architecture change, not a feature change.

## Non-goals

- No new backend tables, RLS policies, or edge functions.
- No SMS delivery-failure tracking (doesn't exist in the schema — flagged as
  a possible future project, out of scope here).
- No named/multi-slot saved table views — auto-persisted last-used
  filter/sort/column-visibility state only.
- No change to the public marketing site or landlord dashboard themes.
- No change to the underlying data-fetching hooks' query logic beyond the
  two new count queries described below.

## Section 1 — Theme & design tokens

Replace the fixed-dark `ADMIN_CARD` / `ADMIN_SURFACE` constants and the
hardcoded `slate-*` sidebar literals with a light navy+teal palette, scoped
to the super-admin area only (does not touch the public site's or landlord
dashboard's theme tokens).

Palette:

```
--admin-sidebar:      #0F172A  (deep navy — sidebar stays dark)
--admin-primary:      #1E3A5F  (navy — primary buttons/links)
--admin-accent:       #0F766E  (teal — active nav, focus ring, secondary actions)
--admin-accent-light: #CCFBF1  (teal tint — subtle highlight backgrounds)
--admin-bg:           #F8FAFC  (page background)
--admin-card:         #FFFFFF
--admin-text:         #0F172A
--admin-text-muted:   #64748B
--admin-border:       #E2E8F0
```

Status colors (success/warning/destructive) stay as the existing app-wide
semantic tokens (`--success`, `--warning`, `--destructive`) — these were
only overridden with literal dark-mode-safe colors in the previous redesign
because the fixed-dark cards made the semantic tokens hard to read; on white
cards the tokens read correctly without overrides, so `STATUS_BADGE_CLASSES`
in `lib/adminStatusColors.ts` drops its literal-color workaround and uses
the semantic tokens directly. The `info` tone (no semantic token exists app-
wide) keeps a literal teal (`border-[#0F766E]/40 text-[#0F766E]`) instead of
the dark-mode blue it used before.

Sidebar stays dark navy — unchanged in spirit from the current build, just
re-themed from slate-900 to `#0F172A` with teal (not glowing violet-primary)
as the active-item accent: a left bar in `--admin-accent` plus a
`--admin-accent-light`-tinted background, replacing the glow effect.

Mechanical scope:
- `src/lib/adminStatusColors.ts`: redefine `ADMIN_CARD`/`ADMIN_SURFACE` as
  light-theme classes (white card, `slate-200` border, soft shadow instead
  of the dark gradient treatment); `STATUS_BADGE_CLASSES` drops literal
  dark-mode colors for the semantic tokens plus the teal `info` literal.
- `src/components/super-admin/SuperAdminLayout.tsx`: re-themed nav/shell —
  dark navy sidebar unchanged in structure, light `#F8FAFC` main content
  area (replaces the dark gradient background), teal active-state instead
  of primary-glow.
- `src/pages/super-admin/SuperAdminDashboard.tsx`: `StatCard` drops the
  per-metric tint-chip system (`TINTS` map with violet/blue/emerald/amber/
  rose) — reverts to a single neutral icon treatment, with color appearing
  only on the trend/description text where relevant (this dashboard doesn't
  currently compute trend deltas, so for this pass that just means: no
  colored icon chips, plain slate icon, numbers in `--admin-text`).
- Every other super-admin page (`OnboardingRequestsPage`, `LandlordsPage`,
  `SubscriptionsPage`, `GlobalPaymentsPage`, `PropertiesPage`,
  `AuditLogsPage`, `SettingsPage`) swaps its literal dark-theme classes
  (`bg-[#121a2e]`, `border-white/10`, `text-slate-400`, dark `Select`/
  `Dialog`/`DropdownMenu` content backgrounds, etc.) for the light
  equivalents. Since every page already routes through the shared
  `ADMIN_CARD`/`ADMIN_SURFACE` constants for its primary surfaces, most of
  this is a low-risk mechanical swap; the remaining per-page literals
  (inputs, selects, dialogs, buttons) get the same light treatment as part
  of this same pass, page by page, verified live after each.

## Section 2 — "Needs Attention" widget

New dashboard section between the stat-card grids and "Recent Landlords."
Surfaces four real, currently-untracked-in-the-UI signals, grounded in
actual schema fields (not the user's original mockup items that don't have
backing data — SMS delivery failures and failed subscription payments were
dropped for this reason):

1. **Unmatched payments** — reuses the existing exact-count query pattern
   already built for `GlobalPaymentsPage`'s tab count.
2. **Failed bank-email parsing** — new count query: `email_logs` where
   `status = 'failed'`, platform-wide (today this status exists per-landlord
   in `useEmailLogs.ts` but isn't surfaced anywhere in super-admin).
3. **Unprocessed webhook callbacks** — new count query: `webhooks_log`
   where `processed = false`.
4. **Subscriptions expiring within 7 days** — reuses the existing count
   already computed for the "Expiring Soon" stat card.

Each present signal renders as a clickable row: icon, count, short label,
chevron, tinted amber (informational) or red (failure) by severity. A
signal with a zero count is omitted entirely — this is an action list, not
a status board, so nothing renders as "0 ✓." If all four are empty, the
section collapses to a single "All clear" line so admins know the check
ran rather than the section silently vanishing.

Click targets:
- Unmatched payments → Payments page, `?tab=unmatched` (new query-param
  read on `GlobalPaymentsPage` to default the active tab).
- Failed bank-email parsing → a simple read-only list dialog (landlord name,
  raw message snippet, error, timestamp) — no new full page.
- Unprocessed webhooks → same pattern, a simple read-only list dialog.
- Expiring subscriptions → Landlords page (unfiltered — the Landlords page
  has no expiry-date filter today; noted as a known gap rather than building
  a new filter solely for this click-through).

New hook: `useNeedsAttention()` added to `useSuperAdminData.ts`, a single
`Promise.all` of the four count queries (two reused, two new).

## Section 3 — Data tables (Landlords, Payments, Onboarding Requests)

New dependency: `@tanstack/react-table`. New shared component,
`src/components/super-admin/DataTable.tsx` — a generic
`<DataTable columns={ColumnDef<T>[]} data={T[]} storageKey={string} />`
wrapping `useReactTable` with the core and sorted row models plus
column-visibility state, rendered through the existing shadcn
`ui/table.tsx` primitives (so it inherits the new light theme with no
extra styling work). A toolbar row above the table carries: a
column-visibility dropdown (checkbox per column) and an "Export CSV"
button (client-side: builds a CSV `Blob` from the currently sorted,
filtered, visible-column rows and triggers a native browser download via a
temporary anchor element — no server round-trip, no new edge function).

**Persisted view state** — scoped down from the broader "saved filters"
idea discussed in brainstorming to auto-persisted last-used state: each
table's search text, status filter, sort, and column-visibility write to
`localStorage` (keyed by the `storageKey` prop, one per page) on change and
restore on mount. This satisfies "don't lose my filter setup between
visits" without building a named/multi-view management UI, which nobody
has asked for yet.

Per-page column plans (existing actions/behavior preserved, just
reorganized into table + row-end overflow menu):

- **Landlords**: Landlord (avatar + name + company), Phone, Status badge,
  Subscription plan, SMS balance, Joined date, Actions (`...` menu:
  View Details / Login as Landlord / Assign Subscription / Allocate SMS /
  Edit Inbound Email / Activate·Suspend). The existing prominent "Manage"
  quick-actions dropdown (Open Dashboard / Add Property / Add House / Add
  Tenant) stays as its own inline button+dropdown in the Landlord cell,
  since those are the single most-used actions and deserve to stay one
  click away rather than buried in the overflow menu.
- **Payments** (`GlobalPaymentsPage`, both "All" and "Unmatched" tabs,
  sharing one column set): Amount, M-Pesa Ref, Sender, Landlord, Date,
  Status badge. The existing cursor-based `useInfiniteQuery` "Load more"
  button stays unchanged beneath the table — the table only sorts/exports/
  shows-hides columns on the rows already loaded into memory; it does not
  attempt to replace server-side pagination with tanstack's own pagination
  model, since the backend is cursor-based, not offset-based.
- **Onboarding Requests**: Name, Email, Phone, Plan badge, Status badge,
  Created date, Actions (`...` menu: Mark contacted / Create account /
  Mark converted / Dismiss — the current four inline buttons collapse into
  this menu since they no longer fit a dense table row).

## Architecture summary

```
lib/adminStatusColors.ts      → light ADMIN_CARD/ADMIN_SURFACE/STATUS_BADGE_CLASSES
components/super-admin/
  SuperAdminLayout.tsx         → re-themed shell (dark navy sidebar, light content)
  DataTable.tsx (new)          → generic tanstack-table wrapper, shared by 3 pages
hooks/useSuperAdminData.ts
  useNeedsAttention() (new)    → 4-signal Promise.all for the dashboard widget
  (existing hooks unchanged otherwise)
pages/super-admin/
  SuperAdminDashboard.tsx      → re-themed StatCard (no tint chips) + NeedsAttention section
  LandlordsPage.tsx            → card-stack → DataTable
  GlobalPaymentsPage.tsx       → card-stack → DataTable (both tabs)
  OnboardingRequestsPage.tsx   → card-stack → DataTable
  SubscriptionsPage.tsx        → theme swap only (stays card-grid; 4 plan
                                  cards is the right shape for this data,
                                  not a table)
  PropertiesPage.tsx           → theme swap only (already uses a real
                                  <Table> on desktop)
  AuditLogsPage.tsx            → theme swap only (list, not a candidate for
                                  tabular columns — log entries are prose)
  SettingsPage.tsx             → theme swap only
```

## Error handling

- The two new `useNeedsAttention()` count queries follow the existing
  exact-count pattern (`supabase.from(...).select('*', { count: 'exact',
  head: true })`); a query failure surfaces as `isError` and the widget
  shows its own "Failed to load" row for that one signal (consistent with
  the dashboard error-state pattern already shipped) rather than silently
  showing 0 or blocking the other three signals.
- `DataTable`'s `localStorage` read/write is wrapped in try/catch per the
  project's existing browser-storage conventions — a private-mode or
  storage-blocked browser falls back to unsaved (session-only) table state
  without erroring.
- CSV export is the first use of the `Blob` + `URL.createObjectURL` +
  temporary `<a download>` pattern in this codebase (no prior CSV/Blob
  export exists to reuse) — standard, no server dependency, nothing
  meaningful to fail against beyond the browser's own download mechanics.

## Testing

- `npx tsc --noEmit -p .` clean after each page's conversion (matches this
  session's established workflow).
- Live browser verification per page after its conversion: visual check of
  the new light theme, confirm every existing action (impersonation login,
  subscription assignment, SMS allocation, onboarding status changes,
  create-landlord-account, plan editing) still works end-to-end, confirm
  table sort/column-visibility/CSV export/persisted-state behave, confirm
  the Needs Attention widget's four signals and their click-throughs.
- No new automated test suite exists in this repo for the super-admin area
  (confirmed by the absence of test files under `src/pages/super-admin/` or
  `src/components/super-admin/`) — this spec does not introduce one; manual
  live verification matches the project's existing practice for this area.
