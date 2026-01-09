-- Create houses table for landlords
CREATE TABLE public.houses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_no TEXT NOT NULL,
  expected_rent NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied')),
  occupancy_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(landlord_id, house_no)
);

-- Enable RLS on houses
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- RLS policies for houses
CREATE POLICY "Landlords can view their own houses" 
ON public.houses FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own houses" 
ON public.houses FOR INSERT 
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own houses" 
ON public.houses FOR UPDATE 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own houses" 
ON public.houses FOR DELETE 
USING (auth.uid() = landlord_id);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  move_in_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenants
CREATE POLICY "Landlords can view their own tenants" 
ON public.tenants FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own tenants" 
ON public.tenants FOR INSERT 
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own tenants" 
ON public.tenants FOR UPDATE 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own tenants" 
ON public.tenants FOR DELETE 
USING (auth.uid() = landlord_id);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  mpesa_ref TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(landlord_id, mpesa_ref)
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Landlords can view their own payments" 
ON public.payments FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own payments" 
ON public.payments FOR INSERT 
WITH CHECK (auth.uid() = landlord_id);

-- Create email_logs table for tracking parsed emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_message TEXT NOT NULL,
  parsed_amount NUMERIC(10,2),
  parsed_house_no TEXT,
  parsed_tenant_name TEXT,
  parsed_mpesa_ref TEXT,
  parsed_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_logs
CREATE POLICY "Landlords can view their own email logs" 
ON public.email_logs FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own email logs" 
ON public.email_logs FOR INSERT 
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own email logs" 
ON public.email_logs FOR UPDATE 
USING (auth.uid() = landlord_id);

-- Create balances table for monthly tracking
CREATE TABLE public.balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  expected_rent NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  carry_forward NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(house_id, month)
);

-- Enable RLS on balances
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for balances
CREATE POLICY "Landlords can view their own balances" 
ON public.balances FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create their own balances" 
ON public.balances FOR INSERT 
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own balances" 
ON public.balances FOR UPDATE 
USING (auth.uid() = landlord_id);

-- Add updated_at triggers
CREATE TRIGGER update_houses_updated_at
BEFORE UPDATE ON public.houses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_logs_updated_at
BEFORE UPDATE ON public.email_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_balances_updated_at
BEFORE UPDATE ON public.balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();