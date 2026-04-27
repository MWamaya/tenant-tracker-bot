CREATE POLICY "Landlords can update their own payments"
  ON public.payments FOR UPDATE
  USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can update payments"
  ON public.payments FOR UPDATE
  USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));