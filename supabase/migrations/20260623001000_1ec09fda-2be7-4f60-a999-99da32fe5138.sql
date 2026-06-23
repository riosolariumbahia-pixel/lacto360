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
    AND lower(email) = lower(v_email)
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido ou não corresponde ao seu e-mail.';
  END IF;

  IF v_inv.accepted_at IS NULL AND v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Convite expirado. Peça um novo convite ao administrador.';
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
  SET accepted_at = COALESCE(accepted_at, now())
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.org_id, v_inv.role;
END $$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;