
CREATE TABLE public.recurring_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  active BOOLEAN NOT NULL DEFAULT true,
  start_month DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses TO authenticated;
GRANT ALL ON public.recurring_expenses TO service_role;

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own recurring expenses"
  ON public.recurring_expenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Super admins view all recurring expenses"
  ON public.recurring_expenses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE INDEX idx_recurring_expenses_landlord ON public.recurring_expenses(landlord_id, active);

CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
