-- One-time recovery: an admin enabled 2FA and got locked out (no SMS
-- provider connected, and testing was in progress without inbox access
-- to retrieve the emailed code). Disable it for every account so sign-in
-- works again; each admin can re-enable it for themselves once the flow
-- is confirmed working end-to-end with a real code.
update public.super_admin_two_factor
set enabled = false, updated_at = now()
where enabled = true;
