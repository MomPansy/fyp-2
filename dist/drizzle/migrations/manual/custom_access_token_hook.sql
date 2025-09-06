CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER           -- run with the function owner's rights :contentReference[oaicite:4]{index=4}
AS $$
DECLARE
  claims       JSONB := event->'claims';
  pub_user_id  UUID;
  user_role    TEXT;
BEGIN
  -- 1. Lookup the public.users.id by auth_user_id
  SELECT id
    INTO pub_user_id
    FROM public.users
   WHERE auth_user_id = (event->> 'user_id')::UUID;   -- cast incoming user_id :contentReference[oaicite:5]{index=5}

  -- 2. Lookup the single role_id for that user
  SELECT role_id
    INTO user_role
    FROM public.user_roles
   WHERE user_id = pub_user_id
   LIMIT 1;   -- ensure only one is picked, matching the docs’ basic example :contentReference[oaicite:6]{index=6}

  -- 3. Only proceed if we found both user and role
  IF pub_user_id IS NOT NULL AND user_role IS NOT NULL THEN

    -- 4. Ensure user_metadata exists
    IF NOT (claims ? 'user_metadata') THEN              -- “?” tests presence of key :contentReference[oaicite:7]{index=7}
      claims := jsonb_set(claims, '{user_metadata}', '{}'::JSONB);
    END IF;

    -- 5. Inject our custom role into user_metadata
    claims := jsonb_set(claims, '{user_metadata,role}', to_jsonb(user_role));

    claims := jsonb_set(claims, '{user_metadata,user_id}', to_jsonb(pub_user_id));


    -- 6. Write back the modified claims into the event
    event := jsonb_set(event, '{claims}', claims);
  END IF;

  RETURN event;
END;
$$

-- 7. Ensure the function is owned by a superuser (e.g. postgres)
ALTER FUNCTION public.custom_access_token_hook(JSONB)
  OWNER TO postgres;

GRANT EXECUTE
  ON FUNCTION public.custom_access_token_hook(JSONB)
  TO supabase_auth_admin;    