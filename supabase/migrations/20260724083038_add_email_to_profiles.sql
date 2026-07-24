-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id AND profiles.email IS NULL;

-- Create partial unique index on email (unique where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (email)
  WHERE email IS NOT NULL;

-- Update trigger function to populate email on new user signup
-- (preserves the 'pending' account_status behavior from the prior version
-- of this trigger, which was accidentally dropped here previously)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, phone, account_status, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'phone',
    'pending',
    NEW.email
  );

  -- Assign LANDLORD_ADMIN role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'LANDLORD_ADMIN');

  RETURN NEW;
END;
$$;
