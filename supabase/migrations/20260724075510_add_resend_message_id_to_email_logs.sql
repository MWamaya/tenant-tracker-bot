ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS resend_message_id TEXT UNIQUE;
