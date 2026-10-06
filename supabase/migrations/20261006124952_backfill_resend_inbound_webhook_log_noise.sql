-- The resend-inbound edge function used to leave its base "resend_inbound"
-- webhooks_log row unprocessed on several normal, non-actionable exit paths
-- (Resend's non-"email.received" event types, duplicate deliveries, etc.) —
-- fixed in code, but the rows already stuck from before that fix need a
-- one-time cleanup so the admin "Needs Attention" count reflects only real
-- issues. The dedicated "resend_inbound_unmatched_recipient" rows are left
-- alone — those stay genuinely actionable (an email is arriving at an
-- address no landlord owns).
update webhooks_log
set processed = true
where webhook_type = 'resend_inbound'
  and processed = false;
