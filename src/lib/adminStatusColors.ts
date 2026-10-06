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
