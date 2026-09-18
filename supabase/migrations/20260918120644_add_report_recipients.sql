-- Extra people (e.g. a caretaker) who should be CC'd on the automated
-- monthly rent report alongside the landlord. Fully landlord-owned/managed.
CREATE TABLE public.report_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own report recipients"
  ON public.report_recipients FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can add their own report recipients"
  ON public.report_recipients FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own report recipients"
  ON public.report_recipients FOR UPDATE
  USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own report recipients"
  ON public.report_recipients FOR DELETE
  USING (auth.uid() = landlord_id);

CREATE TRIGGER update_report_recipients_updated_at
BEFORE UPDATE ON public.report_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
