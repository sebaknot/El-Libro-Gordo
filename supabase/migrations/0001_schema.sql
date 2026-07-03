-- El Libro Gordo — Phase 1 schema
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- users (staff only; id mirrors auth.users)
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('owner', 'agent', 'assistant')),
  totp_enabled boolean not null default false,
  active boolean not null default true
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and active);
$$;

create or replace function public.staff_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid() and active;
$$;

-- Staff can update their own row (e.g. totp_enabled) but only the owner may
-- change role/active/email. Service-role updates (auth.uid() is null) pass.
create or replace function public.users_guard()
returns trigger language plpgsql as $$
begin
  if (new.role is distinct from old.role
      or new.active is distinct from old.active
      or new.email is distinct from old.email)
     and public.staff_role() <> 'owner' then
    raise exception 'only the owner can change role, active, or email';
  end if;
  return new;
end $$;

create trigger users_guard
  before update on public.users
  for each row execute function public.users_guard();

-- ---------------------------------------------------------------------------
-- Core book tables
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary_client_id uuid, -- fk added after clients exists
  household_name text not null,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  annual_income numeric,
  income_verified_date date,
  household_size int,
  preferred_language text not null default 'es' check (preferred_language in ('es', 'en')),
  preferred_channel text check (preferred_channel in ('sms', 'whatsapp', 'email', 'call'))
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid not null references public.households(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  dob date,
  ssn_last4 char(4),
  ssn_encrypted bytea, -- pgcrypto; never selected by app queries (column grant enforced below)
  phone text,
  whatsapp_phone text,
  email text,
  status text not null default 'active'
    check (status in ('active', 'pending', 'canceled', 'medicare_transition', 'deceased')),
  is_primary boolean not null default false,
  immigration_doc_type text,
  notes_summary text
);

alter table public.households
  add constraint households_primary_client_fk
  foreign key (primary_client_id) references public.clients(id) on delete set null;

create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null unique,
  agent_id_number text,
  portal_url text,
  support_phone text
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.clients(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete restrict,
  carrier_id uuid references public.carriers(id) on delete restrict,
  plan_name text,
  plan_type text not null default 'marketplace'
    check (plan_type in ('marketplace', 'medicare', 'dental', 'vision', 'life', 'other')),
  plan_year int not null,
  metal_tier text,
  monthly_premium numeric,
  subsidy_amount numeric,
  net_premium numeric,
  effective_date date,
  termination_date date,
  policy_number text,
  status text not null default 'active'
    check (status in ('active', 'pending', 'terminated', 'delinquent'))
);

-- ---------------------------------------------------------------------------
-- Commissions (owner-editable; historical rows never overwritten)
-- ---------------------------------------------------------------------------

create table public.commission_rates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  carrier_id uuid not null references public.carriers(id) on delete restrict,
  plan_type text not null,
  plan_year int not null,
  rate_per_member_month numeric not null,
  notes text,
  unique (carrier_id, plan_type, plan_year)
);

create table public.commission_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  period_month date not null,
  expected_amount numeric,
  received_amount numeric,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'underpaid', 'missing')),
  reconciled_by uuid references public.users(id),
  unique (policy_id, period_month)
);

-- ---------------------------------------------------------------------------
-- Messaging (Phase 3 uses these; schema lands now)
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete set null,
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  direction text not null check (direction in ('inbound', 'outbound')),
  from_address text not null,
  to_address text not null,
  body text,
  media_urls jsonb,
  read boolean not null default false,
  sent_by uuid references public.users(id),
  message_ref text
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  language text not null check (language in ('en', 'es')),
  body text not null
);

-- ---------------------------------------------------------------------------
-- Verification links (Phase 2 uses these; schema lands now)
-- ---------------------------------------------------------------------------

create table public.enrollment_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  plan_year int not null,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.verification_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid not null references public.households(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  purpose text not null check (purpose in ('renewal', 'income_update', 'new_client_intake')),
  expires_at timestamptz not null,
  max_uses int not null default 3,
  use_count int not null default 0,
  dob_attempts int not null default 0,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'locked')),
  campaign_id uuid references public.enrollment_campaigns(id) on delete set null
);

create index verification_links_token_idx on public.verification_links (token);

create table public.verification_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verification_link_id uuid not null references public.verification_links(id) on delete restrict,
  household_id uuid not null references public.households(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  confirmed_no_changes boolean not null default false,
  changes jsonb,
  client_ip inet,
  user_agent text,
  consent_text_shown text,
  consent_checked boolean not null default false,
  reviewed boolean not null default false,
  reviewed_by uuid references public.users(id)
);

-- CMS paper trail: append-only. Only the review flags may ever change.
create or replace function public.verification_responses_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'verification_responses is append-only';
  end if;
  if (new.verification_link_id, new.household_id, new.submitted_at, new.confirmed_no_changes,
      new.changes, new.client_ip, new.user_agent, new.consent_text_shown, new.consent_checked)
     is distinct from
     (old.verification_link_id, old.household_id, old.submitted_at, old.confirmed_no_changes,
      old.changes, old.client_ip, old.user_agent, old.consent_text_shown, old.consent_checked) then
    raise exception 'verification_responses is append-only (only review flags may change)';
  end if;
  return new;
end $$;

create trigger verification_responses_guard
  before update or delete on public.verification_responses
  for each row execute function public.verification_responses_guard();

create table public.renewal_pipeline (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references public.enrollment_campaigns(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  stage text not null default 'not_contacted'
    check (stage in ('not_contacted', 'contacted', 'link_sent', 'responded', 'needs_changes', 'completed', 'unresponsive')),
  last_contact_at timestamptz,
  auto_reminder_count int not null default 0,
  priority boolean not null default false,
  assigned_to uuid references public.users(id),
  unique (campaign_id, household_id)
);

-- ---------------------------------------------------------------------------
-- Tasks, documents, notes
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid references public.households(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  detail text,
  type text not null default 'manual'
    check (type in ('manual', 'income_stale', 'medicare_aging_in', 'sep_event',
                    'delinquent_policy', 'verification_review', 'commission_discrepancy', 'data_cleanup')),
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  assigned_to uuid references public.users(id),
  auto_generated boolean not null default false
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  storage_path text not null,
  doc_type text not null default 'other'
    check (doc_type in ('id', 'income_proof', 'consent_form', 'policy_doc', 'other')),
  uploaded_by uuid references public.users(id),
  file_name text not null,
  size_bytes bigint
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  author_id uuid references public.users(id),
  body text not null,
  pinned boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Audit log — append-only, no exceptions
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  actor_type text not null check (actor_type in ('staff', 'client_link', 'system')),
  action text not null
    check (action in ('view', 'create', 'update', 'delete', 'export',
                      'login', 'login_failed', 'link_opened', 'link_submitted')),
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  occurred_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_occurred_idx on public.audit_log (occurred_at);

create or replace function public.audit_log_guard()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;

create trigger audit_log_guard
  before update or delete on public.audit_log
  for each row execute function public.audit_log_guard();

-- Insert helper used by the app (captures auth.uid() server-side).
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default null,
  p_ip inet default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  insert into public.audit_log (user_id, actor_type, action, entity_type, entity_id, metadata, ip_address)
  values (auth.uid(), 'staff', p_action, p_entity_type, p_entity_id, p_metadata, p_ip);
end $$;

-- ---------------------------------------------------------------------------
-- SSN encryption — dedicated, audited functions; app never touches ssn_encrypted
-- ---------------------------------------------------------------------------

create or replace function public.set_client_ssn(p_client_id uuid, p_ssn text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_digits text := regexp_replace(p_ssn, '\D', '', 'g');
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  if length(v_digits) <> 9 then
    raise exception 'SSN must be 9 digits';
  end if;
  update public.clients
     set ssn_encrypted = pgp_sym_encrypt(v_digits, p_key),
         ssn_last4 = right(v_digits, 4)
   where id = p_client_id;
  insert into public.audit_log (user_id, actor_type, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'staff', 'update', 'client_ssn', p_client_id, '{"op":"set"}'::jsonb);
end $$;

create or replace function public.reveal_client_ssn(p_client_id uuid, p_key text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ssn text;
begin
  if public.staff_role() not in ('owner', 'agent') then
    raise exception 'not authorized';
  end if;
  select pgp_sym_decrypt(ssn_encrypted, p_key) into v_ssn
    from public.clients where id = p_client_id;
  insert into public.audit_log (user_id, actor_type, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'staff', 'view', 'client_ssn', p_client_id, '{"op":"reveal"}'::jsonb);
  return v_ssn;
end $$;

-- Service-role-only variant used by the one-time import script (no staff session).
create or replace function public.set_client_ssn_admin(p_client_id uuid, p_ssn text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_digits text := regexp_replace(p_ssn, '\D', '', 'g');
begin
  if length(v_digits) <> 9 then
    raise exception 'SSN must be 9 digits';
  end if;
  update public.clients
     set ssn_encrypted = pgp_sym_encrypt(v_digits, p_key),
         ssn_last4 = right(v_digits, 4)
   where id = p_client_id;
  insert into public.audit_log (actor_type, action, entity_type, entity_id, metadata)
  values ('system', 'update', 'client_ssn', p_client_id, '{"op":"import"}'::jsonb);
end $$;

revoke execute on function public.set_client_ssn_admin(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Instant search
-- ---------------------------------------------------------------------------

create index clients_name_trgm_idx on public.clients using gin ((first_name || ' ' || last_name) gin_trgm_ops);
create index clients_phone_idx on public.clients (phone);
create index clients_email_idx on public.clients (email);
create index clients_household_idx on public.clients (household_id);
create index policies_client_idx on public.policies (client_id);
create index policies_household_idx on public.policies (household_id);
create index notes_client_idx on public.notes (client_id);
create index documents_client_idx on public.documents (client_id);
create index households_name_trgm_idx on public.households using gin (household_name gin_trgm_ops);

create or replace function public.search_clients(q text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  dob date,
  phone text,
  email text,
  status text,
  household_id uuid,
  household_name text,
  rank real
) language sql stable security definer set search_path = public as $$
  select c.id, c.first_name, c.last_name, c.dob, c.phone, c.email, c.status,
         c.household_id, h.household_name,
         similarity(c.first_name || ' ' || c.last_name, q) as rank
  from public.clients c
  join public.households h on h.id = c.household_id
  where public.is_staff()
    and (
      (c.first_name || ' ' || c.last_name) ilike '%' || q || '%'
      or similarity(c.first_name || ' ' || c.last_name, q) > 0.25
      or c.phone ilike '%' || q || '%'
      or c.whatsapp_phone ilike '%' || q || '%'
      or c.email ilike '%' || q || '%'
      or h.household_name ilike '%' || q || '%'
      or exists (select 1 from public.policies p
                 where p.client_id = c.id and p.policy_number ilike '%' || q || '%')
    )
  order by rank desc, c.last_name, c.first_name
  limit 25;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'users','households','clients','carriers','policies','commission_rates',
    'commission_payments','messages','message_templates','enrollment_campaigns',
    'verification_links','verification_responses','renewal_pipeline','tasks',
    'documents','notes'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'users','households','clients','carriers','policies','commission_rates',
    'commission_payments','messages','message_templates','enrollment_campaigns',
    'verification_links','verification_responses','renewal_pipeline','tasks',
    'documents','notes','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- users: all staff can read the roster; only owner manages it.
create policy users_select on public.users for select using (public.is_staff());
create policy users_insert on public.users for insert with check (public.staff_role() = 'owner');
create policy users_update on public.users for update
  using (public.staff_role() = 'owner' or id = auth.uid())
  with check (public.staff_role() = 'owner' or id = auth.uid());

-- Book tables: any active staff member has full access.
do $$
declare t text;
begin
  foreach t in array array[
    'households','clients','carriers','policies','messages','message_templates',
    'enrollment_campaigns','verification_links','renewal_pipeline','tasks',
    'documents','notes'
  ] loop
    execute format(
      'create policy %I_staff_all on public.%I for all
       using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- verification_responses: staff read + insert + review-flag updates (trigger guards fields).
create policy verification_responses_select on public.verification_responses
  for select using (public.is_staff());
create policy verification_responses_insert on public.verification_responses
  for insert with check (public.is_staff());
create policy verification_responses_update on public.verification_responses
  for update using (public.is_staff()) with check (public.is_staff());

-- Commissions: staff read; only owner writes.
create policy commission_rates_select on public.commission_rates for select using (public.is_staff());
create policy commission_rates_write on public.commission_rates for insert with check (public.staff_role() = 'owner');
create policy commission_rates_update on public.commission_rates for update
  using (public.staff_role() = 'owner') with check (public.staff_role() = 'owner');
create policy commission_rates_delete on public.commission_rates for delete using (public.staff_role() = 'owner');
create policy commission_payments_select on public.commission_payments for select using (public.is_staff());
create policy commission_payments_write on public.commission_payments for insert with check (public.staff_role() in ('owner', 'agent'));
create policy commission_payments_update on public.commission_payments for update
  using (public.staff_role() in ('owner', 'agent')) with check (public.staff_role() in ('owner', 'agent'));

-- audit_log: staff can read; inserts happen only via log_audit()/security-definer paths.
create policy audit_log_select on public.audit_log for select using (public.is_staff());

-- ssn_encrypted is never readable or writable through the API: column-level grants.
revoke all on public.clients from anon, authenticated;
grant select (id, created_at, updated_at, household_id, first_name, last_name, dob,
              ssn_last4, phone, whatsapp_phone, email, status, is_primary,
              immigration_doc_type, notes_summary)
  on public.clients to authenticated;
grant insert (household_id, first_name, last_name, dob, ssn_last4, phone, whatsapp_phone,
              email, status, is_primary, immigration_doc_type, notes_summary)
  on public.clients to authenticated;
grant update (household_id, first_name, last_name, dob, phone, whatsapp_phone,
              email, status, is_primary, immigration_doc_type, notes_summary)
  on public.clients to authenticated;
grant delete on public.clients to authenticated;

-- audit_log: no direct writes from API roles; reads flow through RLS above.
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private documents bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_staff_read on storage.objects for select
  using (bucket_id = 'documents' and public.is_staff());
create policy documents_staff_write on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_staff());
create policy documents_staff_delete on storage.objects for delete
  using (bucket_id = 'documents' and public.is_staff());
