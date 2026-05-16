-- Add onboarded_at flag to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Admin-only revoke (delete) of pending invitations is already covered by "admins manage invites" RLS.
-- No additional function needed; client just deletes the row.