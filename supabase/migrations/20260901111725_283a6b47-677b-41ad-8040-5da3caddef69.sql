CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.feedback_rating AS ENUM ('positive', 'mixed', 'negative');

CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  default_language TEXT NOT NULL DEFAULT 'no',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  preferred_language TEXT NOT NULL DEFAULT 'no',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_customer_id ON public.profiles(customer_id);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  delivered_at DATE NOT NULL DEFAULT current_date,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliveries_customer_id ON public.deliveries(customer_id);
CREATE INDEX idx_deliveries_delivered_at ON public.deliveries(customer_id, delivered_at DESC);

CREATE TABLE public.shift_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users ON DELETE SET NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  delivery_correct BOOLEAN,
  actual_quantity_received INTEGER,
  sold_this_shift INTEGER NOT NULL DEFAULT 0,
  remaining_stock INTEGER NOT NULL DEFAULT 0,
  guest_feedback_rating public.feedback_rating,
  guest_feedback_text TEXT,
  preparation_issue BOOLEAN NOT NULL DEFAULT false,
  preparation_issue_text TEXT,
  next_required_quantity INTEGER,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shift_reports_customer_id ON public.shift_reports(customer_id, created_at DESC);
CREATE INDEX idx_shift_reports_delivery_id ON public.shift_reports(delivery_id);
CREATE INDEX idx_shift_reports_submitted_by ON public.shift_reports(submitted_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_reports TO authenticated;
GRANT ALL ON public.shift_reports TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT customer_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Flags reports whose numbers do not reconcile with prior stock + deliveries
CREATE OR REPLACE FUNCTION public.flag_report_mismatch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  prev_stock INTEGER;
  prev_at TIMESTAMPTZ;
  delivered INTEGER;
  expected INTEGER;
BEGIN
  SELECT remaining_stock, created_at INTO prev_stock, prev_at
  FROM public.shift_reports
  WHERE customer_id = NEW.customer_id AND id <> NEW.id
  ORDER BY created_at DESC LIMIT 1;

  IF prev_stock IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(COALESCE(
    (SELECT actual_quantity_received FROM public.shift_reports r
     WHERE r.delivery_id = d.id AND r.delivery_correct = false LIMIT 1), d.quantity)), 0)
  INTO delivered
  FROM public.deliveries d
  WHERE d.customer_id = NEW.customer_id AND d.created_at > prev_at;

  expected := prev_stock + COALESCE(delivered, 0) - COALESCE(NEW.sold_this_shift, 0);

  IF ABS(expected - COALESCE(NEW.remaining_stock, 0)) > GREATEST(10, (expected * 0.1)::INTEGER) THEN
    NEW.needs_review := true;
    NEW.review_note := 'Expected approx. ' || expected || ' pcs left, reported ' || NEW.remaining_stock || ' pcs.';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_shift_reports_flag BEFORE INSERT ON public.shift_reports
FOR EACH ROW EXECUTE FUNCTION public.flag_report_mismatch();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated
  USING (public.is_admin() OR id = public.current_customer_id());
CREATE POLICY "customers_admin_insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "customers_admin_update" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "customers_admin_delete" ON public.customers FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin() OR id = auth.uid());
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND customer_id = public.current_customer_id());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "deliveries_select" ON public.deliveries FOR SELECT TO authenticated
  USING (public.is_admin() OR customer_id = public.current_customer_id());
CREATE POLICY "deliveries_admin_insert" ON public.deliveries FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "deliveries_admin_update" ON public.deliveries FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "deliveries_admin_delete" ON public.deliveries FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "shift_reports_select" ON public.shift_reports FOR SELECT TO authenticated
  USING (public.is_admin() OR customer_id = public.current_customer_id());
CREATE POLICY "shift_reports_customer_insert" ON public.shift_reports FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND (public.is_admin() OR customer_id = public.current_customer_id()));
CREATE POLICY "shift_reports_admin_update" ON public.shift_reports FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "shift_reports_admin_delete" ON public.shift_reports FOR DELETE TO authenticated
  USING (public.is_admin());