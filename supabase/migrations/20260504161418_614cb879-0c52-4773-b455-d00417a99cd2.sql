-- Allow landlords to delete their own payments and email logs
CREATE POLICY "Landlords can delete their own payments"
ON public.payments FOR DELETE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can delete payments"
ON public.payments FOR DELETE
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Landlords can delete their own email logs"
ON public.email_logs FOR DELETE
USING (auth.uid() = landlord_id);

CREATE POLICY "Super Admins can delete email logs"
ON public.email_logs FOR DELETE
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));