# Security Hardening Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the first priority from the approved application review: close credential exposure, enforce session-bound admin verification, prevent guessed payment ownership, and stop email content from silently becoming verified money.

**Architecture:** Keep React, Supabase, and the current email OTP experience. Enforce admin authorization in Postgres and Edge Functions; retain the password session during OTP verification and bind approval to its session_id. Keep uncertain payments visible for manual resolution.

**Tech Stack:** TypeScript, React, Deno, Supabase/Postgres, Vitest.

**Spec:** User-approved review in this conversation. User requires current branch `calvin-dev` and no co-author commit trailers.

## Global Constraints

- Work directly on `calvin-dev`; no worktree or branch switch.
- No co-author trailers in commits. Do not deploy or change live account settings.
- Existing unverified admin sessions must lose privileged access when 2FA is enabled.
- OTP verification must not authorize another session, allow replay, or race attempt limits.
- Never infer landlord ownership from an unscoped house number or first active profile.
- Email content and forwarded headers are untrusted. Parsed amounts remain reviewable evidence.

## Review Focus

- Admin signs in through landlord login or calls API directly: enabled OTP still gates privileges.
- Session refresh preserves verified session identity; a new login does not inherit approval.
- Simultaneous OTP guesses serialize; expired, consumed, and cross-session codes fail.
- Unknown/duplicate callback identities remain unassigned and never become another landlord's rent.
- Bank-branded forged content cannot create an automatically verified payment.

### Task 1: Retire public OAuth token endpoint

**Files:** `supabase/functions/mpesa-auth/index.ts`, its handler and Deno test.
**Interfaces:** Export a pure request handler returning HTTP 410 without accessing credentials or calling Safaricom.
- [ ] Write tests for POST/GET/public-key requests: no access_token in response.
- [ ] Run tests and observe failure before implementation.
- [ ] Return a stable retired-endpoint error; keep server OAuth inside existing STK functions.
- [ ] Run Deno tests and commit.

### Task 2: Enforce session-bound admin OTP

**Files:** New security migration and SQL integration test; OTP endpoints; admin endpoints; `useSuperAdmin`; admin login.
**Interfaces:** `has_role(uuid, app_role)` retains signature but gates SUPER_ADMIN by session verification when enabled. Service-only `verify_super_admin_otp(user, session, hash)` atomically consumes a code and grants that session permission. Admin Edge Functions check user-scoped `has_role`.
- [ ] Add SQL integration tests proving enabled OTP blocks raw password sessions, valid code unlocks only its session, invalid/expired/replayed codes fail, and settings cannot bypass enforcement.
- [ ] Run against baseline and observe failures.
- [ ] Add session verification storage, transactional verification, and database authorization enforcement.
- [ ] Keep browser session through OTP; recheck authorization after success; scope issuance to authenticated session.
- [ ] Test SQL and Edge Function boundaries; commit.

### Task 3: Resolve payment ownership explicitly

**Files:** M-Pesa callback, rent STK request function, new request mapping migration, shared resolver and tests.
**Interfaces:** Persist CheckoutRequestID -> landlord/house/tenant at initiation. C2B ownership requires exactly one configured payment source. Unknown ownership is logged for review without creating a landlord payment.
- [ ] Add tests for unknown shortcode, duplicate shortcode, rent STK mapping, and unknown checkout ID.
- [ ] Observe failures, implement deterministic resolution, then rerun tests.
- [ ] Ensure known subscription IDs never fall through to rent processing after completion.
- [ ] Commit.

### Task 4: Treat email as reviewable payment evidence

**Files:** Inbound email handler, bank parser/tests, manual reconciliation tests, deployment notes.
**Interfaces:** Parsed email creates pending email_log only; manual reconciliation remains the explicit confirmation path.
- [ ] Add tests proving forged bank branding cannot auto-create payment and legitimate forwarded content remains available for review.
- [ ] Observe failures, implement evidence-only email ingestion, rerun tests.
- [ ] Document behavior change, migration/deployment order, and remaining review priorities.
- [ ] Commit and run complete frontend/backend suites, type check, build, and lint; report existing failures explicitly.

## Following Batches

Keep remaining approved priorities visible: transactional receipt allocations and subscription activation; historical tenancy/rent accounting; server subscription restrictions; persistent SMS/settings workflows; CI, type/lint debt, and performance. These require separate testable batches after this security boundary is established.
