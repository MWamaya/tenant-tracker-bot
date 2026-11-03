# Mobile landing fixes

User approved fixing findings from the mobile visitor review in this conversation. Work directly on calvin-dev; no co-author trailers, push, deployment, or real lead/email submission.

Keep Kodi Pap branding, DM Sans typography, navy/green palette and Kenyan imagery. Builder decisions: use one sticky header with 44px mobile links, remove bottom overlays/arrows, present mobile hero text on a solid background, keep imagery beside the desktop hero, and shorten the mobile page by removing duplicate before/after content and using compact features and expandable plan details. Keep sections navigable with header clearance.

Restore honest payment language: supported M-Pesa feeds may match automatically; forwarded email receipts require landlord bank confirmation. Show setup expectations and minimum plan price beside the initial action. Prices remain fixed capacity tiers, not metered per actual tenant.

Annual/monthly choice must survive plan selection, signup pricing, saved onboarding lead, admin lead view and existing notification templates. Accept monthly for old clients omitting the field; reject unsupported explicit values. Never treat a selected billing period as a payment or subscription activation.

New onboarding navigation opens at page heading with meaningful focus. Use input autocomplete. Dashboard and setup walkthrough become manual, with readable active descriptions and no timed advancement. Preserve existing desktop usefulness and all public routes. Lazy-load authenticated screens so mobile landing visitors do not load the full app.

Verification: browser tap/scroll/price tests at 320/360/390/430px; annual lead payload tested with network intercepted locally only; unit and Deno endpoint tests; build/lint/type checks. Safari, physical keyboard/safe-area and live provider behavior remain staging/device checks.
