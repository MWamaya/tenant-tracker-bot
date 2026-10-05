// Shared status-badge color classes for the super-admin area, using the
// app's semantic design tokens (same ones the redesigned landing/legal
// pages use) instead of each page hand-rolling its own green-500/red-500/
// yellow-500 literals — success/warning/destructive are vivid enough to
// read fine regardless of background.
//
// "info" and "neutral" stay literal slate/blue shades on purpose: the
// --primary token is a dark navy tuned for light backgrounds, so
// text-primary on this area's dark slate-800 cards is close to
// dark-on-dark and unreadable. This area is a fixed-dark design (not
// theme-aware), so there's no semantic "info" token that actually works
// here — a real blue is the correct, deliberate choice, not a leftover.
export const STATUS_BADGE_CLASSES = {
  success: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  destructive: 'border-destructive/40 text-destructive',
  info: 'border-blue-500 text-blue-400',
  neutral: 'border-slate-500 text-slate-400',
} as const;

export type StatusBadgeTone = keyof typeof STATUS_BADGE_CLASSES;

// Shared elevated-card treatment for the super-admin area: a faint
// top-to-bottom gradient + inset border + soft shadow so cards read as
// raised surfaces instead of flat slate rectangles. Replaces the old
// flat "bg-slate-800/50 border-slate-700" used everywhere.
export const ADMIN_CARD =
  'bg-[#121a2e] bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] shadow-lg shadow-black/20 rounded-xl';

// Nested/inset surfaces inside a card (table rows, list items).
export const ADMIN_SURFACE = 'bg-white/[0.03] border border-white/[0.06] rounded-lg';
export const ADMIN_SURFACE_HOVER = 'hover:bg-white/[0.06] transition-colors duration-150';
