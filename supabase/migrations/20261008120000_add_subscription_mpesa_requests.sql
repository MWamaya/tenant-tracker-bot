-- Tracks STK Push requests landlords trigger to pay for their own platform
-- subscription, so mpesa-callback can look up which landlord/plan a
-- CheckoutRequestID belongs to and auto-activate on success.
CREATE TABLE public.subscription_mpesa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  checkout_request_id text NOT NULL UNIQUE,
  merchant_request_id text,
  phone text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  failure_reason text,
  mpesa_receipt_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_mpesa_requests ENABLE ROW LEVEL SECURITY;

-- Landlords can see the status of their own payment attempts (frontend
-- polls this while waiting for the M-Pesa callback). All writes happen
-- through edge functions using the service role, so no insert/update
-- policy is needed for regular users.
CREATE POLICY "Landlords can view their own subscription payment requests"
ON public.subscription_mpesa_requests
FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can view all subscription payment requests"
ON public.subscription_mpesa_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE TRIGGER update_subscription_mpesa_requests_updated_at
BEFORE UPDATE ON public.subscription_mpesa_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subscription_mpesa_requests_landlord ON public.subscription_mpesa_requests(landlord_id);
