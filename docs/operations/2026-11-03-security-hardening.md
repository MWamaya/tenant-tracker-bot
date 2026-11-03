# Security hardening deployment notes

Changes are prepared on `calvin-dev`; nothing has been deployed by this work.

## Deployment order

1. Apply `20261103100000_enforce_admin_session_verification.sql` and `20261103110000_add_rent_mpesa_requests.sql` through the usual Supabase migration process. Test against a staging copy first; the local SQL harness uses a reduced schema and is not a full migration replay.
2. Deploy `mpesa-auth` immediately to retire the old OAuth-token endpoint. Review provider logs and rotate exposed credentials through the provider's normal process if access tokens were disclosed.
3. Deploy the admin request/verify OTP functions, admin create/delete functions, and `mpesa-c2b-register` with their shared modules. Deploy the updated frontend in the same maintenance window. OTP-enabled admins lose privileged access until their current password session verifies its email code. Existing codes without session identity cannot be used. Approval expires after 24 hours, or on any change to OTP settings.
4. Deploy `mpesa-stk-push` before `mpesa-callback` so new rent checkout IDs have persisted ownership. Old outstanding checkouts without a mapping will enter the unresolved webhook queue instead of being guessed. If tracking fails after a prompt was sent, inspect the request log and provider record before retrying. Never fabricate a mapping from phone/house alone.
5. Deploy `resend-inbound` with the frontend. Existing processed payments stay unchanged; new parsed emails remain pending under **Needs Review**. Landlords must confirm the amount/reference in their bank statement before posting. Resend signatures authenticate delivery, not the bank or forwarded message contents.

## Operational checks

- Test an OTP-enabled admin through both login pages and direct API calls: password alone must not grant admin privileges. Verify one session; another must remain blocked. Ordinary landlord login must still work.
- Verify a staged rent STK request and callback retain the initiating landlord/house/tenant. Unknown/ambiguous shortcodes, missing checkouts, and amount mismatches must create no financial records; inspect unprocessed `webhooks_log` rows as operator.
- Confirm each C2B shortcode maps to exactly one active `payment_sources` row. Shared/ambiguous codes remain quarantined until explicit ownership exists.
- Confirm Supabase's trusted proxy overwrites the client IP headers consumed by the existing callback allowlist. This batch does not establish that deployment guarantee or add provider transaction verification. Ownership mapping alone does not authenticate a callback.
- Forward a staged bank receipt: it must appear pending with no payment/balance change. Confirm manually only after checking the bank.
- Monitor unresolved callbacks and repeated retryable email ingestion failures. Current operator resolution is manual; this batch adds no financial replay tool.

## Verification

- `npm test`
- `deno test --allow-env supabase/functions`
- Disposable local PostgreSQL only: `psql -v apply_hardening=1 -f supabase/tests/admin-session-security.sql` and `psql -f supabase/tests/rent-checkout-security.sql` (supply local host/port/database as needed). These tests create reduced auth fixtures and roll back.
- `npm run build`, TypeScript application check, and lint. Existing type/lint debt remains separately tracked in the application review.

## Remaining priorities

Next batch: transactional receipt allocation, reconciliation/balance updates, deposit tagging, and subscription activation/replay safety. Then historical tenancy/rent accounting, server-enforced subscription limits, persistent SMS/settings workflows, and CI/type/lint/performance cleanup.

Avoid reverting the authorization migration as a quick rollback: doing so reopens password-only admin access. Prefer forward fixes; keep the token endpoint retired and email ingestion evidence-only.
