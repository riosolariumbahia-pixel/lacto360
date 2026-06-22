
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS TABLE(org_id uuid, role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text;
  v_inv     public.invitations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT * INTO v_inv FROM public.invitations
   WHERE token = _token
     AND accepted_at IS NULL
     AND expires_at > now()
     AND lower(email) = lower(v_email)
   LIMIT 1;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido, expirado ou não corresponde ao seu e-mail.';
  END IF;

  -- Vincula o profile à organização do convite
  UPDATE public.profiles SET org_id = v_inv.org_id WHERE id = v_user_id;

  -- Substitui papéis anteriores do usuário pelo papel do convite
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (v_user_id, v_inv.org_id, v_inv.role);

  UPDATE public.invitations SET accepted_at = now() WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.org_id, v_inv.role;
END $$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
