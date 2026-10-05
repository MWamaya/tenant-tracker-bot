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
