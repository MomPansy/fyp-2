CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_pub_user_id UUID;
BEGIN
  -- 1. Insert into public.users (or skip if already exists), capture its PK
  INSERT INTO public.users (auth_user_id)
  VALUES (NEW.id)
    ON CONFLICT (auth_user_id) DO NOTHING          -- avoid duplicates :contentReference[oaicite:3]{index=3}
  RETURNING id INTO new_pub_user_id;               -- capture the new or existing user_id :contentReference[oaicite:4]{index=4}

  -- 2. If no row was inserted (conflict), retrieve the existing id
  IF new_pub_user_id IS NULL THEN
    SELECT id
      INTO new_pub_user_id
      FROM public.users
     WHERE auth_user_id = NEW.id;                  -- fetch existing mapping :contentReference[oaicite:5]{index=5}
  END IF;

  -- 3. Insert into public.user_roles with fixed role_id, avoid duplicates
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (new_pub_user_id, 'admin')
    ON CONFLICT (user_id, role_id) DO NOTHING;     -- upsert behavior :contentReference[oaicite:6]{index=6}

  RETURN NEW;
END;
$$

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_public ON auth.users;

CREATE TRIGGER trg_sync_auth_user_to_public
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public();
