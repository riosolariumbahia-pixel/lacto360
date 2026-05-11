
-- =========== ENUM ===========
create type public.app_role as enum ('admin', 'op_manager', 'sales_manager', 'seller');

-- =========== ORGANIZATIONS ===========
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'trial',
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- =========== PROFILES ===========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create index profiles_org_id_idx on public.profiles(org_id);

-- =========== USER ROLES ===========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, org_id, role)
);
alter table public.user_roles enable row level security;
create index user_roles_user_idx on public.user_roles(user_id);
create index user_roles_org_idx on public.user_roles(org_id);

-- =========== INVITATIONS ===========
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_by uuid not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.invitations enable row level security;
create index invitations_email_idx on public.invitations(lower(email));
create index invitations_token_idx on public.invitations(token);

-- =========== SECURITY DEFINER FUNCTIONS ===========
create or replace function public.has_role(_user_id uuid, _org_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and org_id = _org_id and role = _role
  );
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_org_member(_user_id uuid, _org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = _user_id and org_id = _org_id);
$$;

-- =========== HANDLE NEW USER TRIGGER ===========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_org_id uuid;
  v_role public.app_role;
  v_full_name text;
  v_company text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_company := coalesce(new.raw_user_meta_data->>'company_name', v_full_name || ' Laticínios');

  -- accept invite if token provided
  select * into v_invite from public.invitations
    where token = (new.raw_user_meta_data->>'invite_token')
      and accepted_at is null
      and expires_at > now()
    limit 1;

  if v_invite.id is not null then
    v_org_id := v_invite.org_id;
    v_role := v_invite.role;
    update public.invitations set accepted_at = now() where id = v_invite.id;
  else
    insert into public.organizations (name, owner_id)
    values (v_company, new.id)
    returning id into v_org_id;
    v_role := 'admin';
  end if;

  insert into public.profiles (id, org_id, full_name)
  values (new.id, v_org_id, v_full_name);

  insert into public.user_roles (user_id, org_id, role)
  values (new.id, v_org_id, v_role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========== UPDATED_AT TRIGGERS ===========
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.tg_set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- =========== RLS POLICIES ===========

-- organizations
create policy "members read own org" on public.organizations for select
  using (public.is_org_member(auth.uid(), id));
create policy "admins update own org" on public.organizations for update
  using (public.has_role(auth.uid(), id, 'admin'));

-- profiles
create policy "view own profile" on public.profiles for select
  using (id = auth.uid());
create policy "view org members profiles" on public.profiles for select
  using (org_id = public.current_org_id());
create policy "update own profile" on public.profiles for update
  using (id = auth.uid());

-- user_roles
create policy "view own roles" on public.user_roles for select
  using (user_id = auth.uid());
create policy "admins view org roles" on public.user_roles for select
  using (public.has_role(auth.uid(), org_id, 'admin'));
create policy "admins insert org roles" on public.user_roles for insert
  with check (public.has_role(auth.uid(), org_id, 'admin'));
create policy "admins update org roles" on public.user_roles for update
  using (public.has_role(auth.uid(), org_id, 'admin'));
create policy "admins delete org roles" on public.user_roles for delete
  using (public.has_role(auth.uid(), org_id, 'admin'));

-- invitations
create policy "admins manage invites" on public.invitations for all
  using (public.has_role(auth.uid(), org_id, 'admin'))
  with check (public.has_role(auth.uid(), org_id, 'admin'));
create policy "anyone read invite by token" on public.invitations for select
  using (true);
