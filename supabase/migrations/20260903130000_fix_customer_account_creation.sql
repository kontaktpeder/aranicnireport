-- Fix customer (and admin) account creation.
--
-- The original schema enabled RLS on profiles/user_roles/customers but:
--   1. never added INSERT policies for profiles or user_roles
--   2. never granted writes on user_roles to authenticated
--   3. never added service_role policies (needed if the secret key does not BYPASSRLS)
--   4. never attached a handle_new_user trigger, so auth.admin.createUser
--      could fail if a Cloud-side trigger expected columns we don't have
--
-- Result: "Ny kunde" rolled back after login creation / profile insert.

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Explicit service_role policies so admin server functions can write even when
-- the secret API key is subject to RLS (Lovable Cloud / new sb_secret_ keys).
DROP POLICY IF EXISTS "customers_service_role" ON public.customers;
CREATE POLICY "customers_service_role" ON public.customers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_roles_service_role" ON public.user_roles;
CREATE POLICY "user_roles_service_role" ON public.user_roles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "deliveries_service_role" ON public.deliveries;
CREATE POLICY "deliveries_service_role" ON public.deliveries
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shift_reports_service_role" ON public.shift_reports;
CREATE POLICY "shift_reports_service_role" ON public.shift_reports
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname TEXT;
  lang TEXT;
BEGIN
  uname := NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'username', ''))), '');
  IF uname IS NULL THEN
    uname := NULLIF(lower(trim(split_part(COALESCE(NEW.email, ''), '@', 1))), '');
  END IF;
  IF uname IS NULL THEN
    uname := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  lang := COALESCE(NULLIF(NEW.raw_user_meta_data->>'preferred_language', ''), 'no');

  INSERT INTO public.profiles (id, username, preferred_language)
  VALUES (NEW.id, uname, lang)
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        preferred_language = EXCLUDED.preferred_language;

  RETURN NEW;
END;
$$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'auth.users'::regclass
      AND NOT t.tgisinternal
      AND (
        t.tgname ILIKE '%profile%'
        OR t.tgname ILIKE '%handle_new_user%'
        OR t.tgname ILIKE '%on_auth_user%'
        OR p.proname ILIKE '%profile%'
        OR p.proname ILIKE '%handle_new_user%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
  END LOOP;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Auth inserts into auth.users as supabase_auth_admin; the trigger then writes
-- public.profiles. Grant the minimum needed in case RLS is forced.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT INSERT, UPDATE ON public.profiles TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END $$;
