# Mobile Landing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, then one fresh-context review.

**Goal:** Fix reviewed mobile landing usability and preserve pricing intent through onboarding.
**Architecture:** Keep React/shadcn and Supabase. Simplify marketing page chrome; persist billing period as validated lead metadata, not a subscription purchase. Lazy-load authenticated routes.
**Tech Stack:** React18/TypeScript, Vitest/React renderer, Deno, Postgres, local Chromium.
**Spec:** docs/superpowers/specs/2026-11-03-mobile-landing-design.md

## Global Constraints
- Current calvin-dev branch, no co-author trailers, no deployment or real lead/email submission.
- Existing navy/green, DM Sans and Kenyan imagery retained.
- Annual choice retained end-to-end; omitted billing period defaults monthly for legacy clients.
- Email receipts require bank confirmation; no blanket automatic bank posting promises.
- Navigation cannot obstruct mobile plan selection; active step explanations remain visible.

## Review Focus
- Narrow screens and section anchors: heading/action remains unobstructed.
- Annual selection through saved lead/admin display; legacy monthly inputs still accepted.
- Client route change after deep scroll: heading visible and focused.
- Manual demo interaction and reduced-motion users: content does not advance itself.
- Lazy public/auth route loading: fallback present and deep-link navigation still works.

### Task 1: Preserve onboarding intent
**Files:** GetStarted.tsx and test; onboarding-submit handler and Deno test; new billing_period migration; generated types/useSuperAdminData/admin lead display; plans.ts copy.
**Interface:** billingPeriod: 'monthly'|'annual' request -> billing_period column; omitted request defaults monthly.
- [ ] RED: annual signup shows KES12,000/year, sends annual; invalid explicit billing400; legacy omitted saves monthly; new page resets scroll/focus.
- [ ] Implement validated persistence and show billing period to admin and in notification templates.
- [ ] GREEN: frontend/endpoint regressions and migration constraint check; commit.

### Task 2: Simplify mobile landing
**Files:** Landing.tsx and regression tests/browser assertions.
- [ ] Capture RED browser assertions for covered Choose Starter, annual link losing billing, auto-advancing preview and hidden step explanation.
- [ ] Implement unified header, solid mobile hero, accurate copy, compact sections, minimum plan prices, manual accessible previews.
- [ ] GREEN: Chromium 320/360/390/430, actual anchor/plan tap, headline/CTA visibility, no overflow; commit.

### Task 3: Loading and final verification
**Files:** App.tsx, public navigation component if needed, review/rollout notes.
- [ ] Lazy-load authenticated pages behind Suspense and verify public/auth deep links in browser.
- [ ] Run frontend and Deno suites, build, lint/type checks; measure initial bundle; disclose baseline failures.
- [ ] Fresh review, fix Important/Critical findings with regression tests, final commit. Keep branch locally.
