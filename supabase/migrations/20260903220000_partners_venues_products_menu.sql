-- Partners (trade customers) vs venues (serving locations), product catalogue
-- and per-venue Gold of Sicily menus. Existing customers remain venues.

CREATE TYPE public.partner_kind AS ENUM ('distributor', 'direct');

CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  kind public.partner_kind NOT NULL DEFAULT 'distributor',
  active BOOLEAN NOT NULL DEFAULT true,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partners_active ON public.partners(active);

ALTER TABLE public.customers
  ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN slug TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN contact_name TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN website_url TEXT,
  ADD COLUMN instagram TEXT,
  ADD COLUMN image_url TEXT,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN menu_intro TEXT,
  ADD COLUMN serving_method TEXT,
  ADD COLUMN public_visible BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_customers_slug ON public.customers(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_customers_partner_id ON public.customers(partner_id);
CREATE INDEX idx_customers_public ON public.customers(public_visible, active) WHERE public_visible = true;

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_no TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_no TEXT,
  description_en TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_name TEXT,
  description TEXT,
  price_ore INTEGER,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

CREATE INDEX idx_venue_menu_items_customer ON public.venue_menu_items(customer_id, sort_order);
CREATE INDEX idx_venue_menu_items_product ON public.venue_menu_items(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_menu_items TO authenticated;
GRANT ALL ON public.venue_menu_items TO service_role;

CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_venue_menu_items_updated_at BEFORE UPDATE ON public.venue_menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.slugify_name(input TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(
    trim(both '-' FROM regexp_replace(
      regexp_replace(
        lower(replace(replace(replace(replace(replace(replace(coalesce(input, ''),
          'æ','ae'), 'ø','o'), 'å','a'), 'Æ','ae'), 'Ø','o'), 'Å','a')),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_customer_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND btrim(NEW.slug) <> '' THEN
    NEW.slug := public.slugify_name(NEW.slug);
    RETURN NEW;
  END IF;
  base := coalesce(public.slugify_name(NEW.name), 'sted');
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.customers c WHERE c.slug = candidate AND c.id IS DISTINCT FROM NEW.id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n::TEXT;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_slug BEFORE INSERT OR UPDATE OF name, slug ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.ensure_customer_slug();

UPDATE public.customers
SET city = COALESCE(city, NULLIF(location, ''))
WHERE city IS NULL AND location IS NOT NULL;

INSERT INTO public.products (sku, slug, name_no, name_en, description_no, description_en, sort_order)
VALUES
  (
    'GOS-NDUJA',
    'nduja',
    'Nduja Arancini',
    'Nduja Arancini',
    'Sprø arancini med ''nduja.',
    'Crisp arancini with ''nduja.',
    10
  ),
  (
    'GOS-TRUFFLE',
    'truffle',
    'Truffle Arancini',
    'Truffle Arancini',
    'Sprø arancini med trøffel og sopp.',
    'Crisp arancini with truffle and mushroom.',
    20
  )
ON CONFLICT (sku) DO NOTHING;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_admin_select" ON public.partners FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR id = (SELECT partner_id FROM public.customers WHERE id = public.current_customer_id())
  );
CREATE POLICY "partners_admin_insert" ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "partners_admin_update" ON public.partners FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "partners_admin_delete" ON public.partners FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (public.is_admin() OR active = true);
CREATE POLICY "products_admin_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "products_admin_update" ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "products_admin_delete" ON public.products FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "menu_select" ON public.venue_menu_items FOR SELECT TO authenticated
  USING (public.is_admin() OR customer_id = public.current_customer_id());
CREATE POLICY "menu_admin_insert" ON public.venue_menu_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "menu_admin_update" ON public.venue_menu_items FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "menu_admin_delete" ON public.venue_menu_items FOR DELETE TO authenticated
  USING (public.is_admin());
