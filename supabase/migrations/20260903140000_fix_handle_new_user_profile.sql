-- Lovable Cloud auth linking installs handle_new_user() with columns that do
-- not exist on this project's profiles table (e.g. first_name / avatar_url).
-- That makes auth.admin.createUser fail with "Database error creating new user",
-- so admins cannot add customers. Keep the trigger, but write our actual columns.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_username TEXT;
  meta_language TEXT;
  meta_customer_id UUID;
BEGIN
  meta_username := NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'username', ''))), '');
  IF meta_username IS NULL OR meta_username = '' THEN
    meta_username := split_part(NEW.email, '@', 1);
  END IF;

  meta_language := COALESCE(NULLIF(NEW.raw_user_meta_data->>'language', ''), 'no');
  IF meta_language NOT IN ('no', 'en') THEN
    meta_language := 'no';
  END IF;

  BEGIN
    meta_customer_id := NULLIF(NEW.raw_user_meta_data->>'customer_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    meta_customer_id := NULL;
  END;

  INSERT INTO public.profiles (id, username, customer_id, preferred_language)
  VALUES (NEW.id, meta_username, meta_customer_id, meta_language)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    customer_id = COALESCE(EXCLUDED.customer_id, public.profiles.customer_id),
    preferred_language = EXCLUDED.preferred_language;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
