GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO service_role;

CREATE OR REPLACE VIEW public.invitation_statuses
WITH (security_invoker = on)
AS
SELECT
  id,
  org_id,
  email,
  role,
  token,
  invited_by,
  expires_at,
  accepted_at,
  created_at,
  CASE
    WHEN accepted_at IS NOT NULL THEN 'aceito'
    WHEN expires_at <= now() THEN 'expirado'
    ELSE 'pendente'
  END AS status
FROM public.invitations;

GRANT SELECT ON public.invitation_statuses TO authenticated;
GRANT ALL ON public.invitation_statuses TO service_role;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS TABLE(org_id uuid, role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text;
  v_name    text;
  v_inv     public.invitations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    INTO v_email, v_name
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = _token
    AND accepted_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(v_email)
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido, expirado ou não corresponde ao seu e-mail.';
  END IF;

  INSERT INTO public.profiles (id, org_id, full_name)
  VALUES (v_user_id, v_inv.org_id, v_name)
  ON CONFLICT (id) DO UPDATE
    SET org_id = EXCLUDED.org_id,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = now();

  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (v_user_id, v_inv.org_id, v_inv.role)
  ON CONFLICT (user_id, org_id, role) DO NOTHING;

  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.org_id, v_inv.role;
END $$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_org_id uuid;
  v_role public.app_role;
  v_full_name text;
  v_company text;
  v_token text;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_company := COALESCE(new.raw_user_meta_data->>'company_name', v_full_name || ' Laticínios');
  v_token := new.raw_user_meta_data->>'invite_token';

  IF v_token IS NOT NULL AND length(v_token) > 0 THEN
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE token = v_token
      AND accepted_at IS NULL
      AND expires_at > now()
      AND lower(email) = lower(new.email)
    LIMIT 1;

    IF v_invite.id IS NULL THEN
      RAISE EXCEPTION 'Convite inválido, expirado ou e-mail não corresponde ao convite.';
    END IF;

    v_org_id := v_invite.org_id;
    v_role := v_invite.role;
    UPDATE public.invitations SET accepted_at = now() WHERE id = v_invite.id;
  ELSE
    INSERT INTO public.organizations (name, owner_id)
    VALUES (v_company, new.id)
    RETURNING id INTO v_org_id;
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, org_id, full_name)
  VALUES (new.id, v_org_id, v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET org_id = EXCLUDED.org_id,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = now();

  DELETE FROM public.user_roles WHERE user_id = new.id;
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (new.id, v_org_id, v_role)
  ON CONFLICT (user_id, org_id, role) DO NOTHING;

  RETURN new;
END;
$$;