-- El Libro Gordo — web import: batches, mappings, undo
-- Run after 0002_delete_household.sql.
-- (Numbered 0003 because 0002 was already taken by the household-deletion
-- migration that shipped earlier.)

-- ---------------------------------------------------------------------------
-- import_batches: one row per upload. The parsed spreadsheet rows live in
-- payload_encrypted (pgcrypto, same key as SSNs) for at most 30 minutes and
-- only pass through the security-definer RPCs below — the column itself has
-- no API grant, so SSNs/DOBs in transit are never readable through the API.
-- ---------------------------------------------------------------------------

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_by uuid not null references public.users(id),
  filename text not null,
  sheet_name text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'mapped', 'importing', 'imported', 'failed', 'undone', 'expired')),
  mapping jsonb,
  options jsonb,
  row_count int not null default 0,
  created_households int not null default 0,
  created_clients int not null default 0,
  created_policies int not null default 0,
  created_carriers int not null default 0,
  updated_clients int not null default 0,
  skipped_rows int not null default 0,
  warning_rows int not null default 0,
  error_rows int not null default 0,
  finished_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 minutes',
  payload_encrypted bytea,
  report jsonb, -- masked, PII-free report used for the results page + CSV
  undone_at timestamptz,
  undone_by uuid references public.users(id)
);

create index import_batches_uploader_idx on public.import_batches (uploaded_by, created_at desc);

create trigger import_batches_updated_at before update on public.import_batches
  for each row execute function public.set_updated_at();

-- Saved column mappings for repeat uploads from the same source.
create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.users(id),
  name text not null,
  mapping jsonb not null
);

create trigger import_mappings_updated_at before update on public.import_mappings
  for each row execute function public.set_updated_at();

-- Tag every record created by an import with its batch.
alter table public.households add column import_batch_id uuid references public.import_batches(id) on delete set null;
alter table public.clients add column import_batch_id uuid references public.import_batches(id) on delete set null;
alter table public.policies add column import_batch_id uuid references public.import_batches(id) on delete set null;
alter table public.carriers add column import_batch_id uuid references public.import_batches(id) on delete set null;

create index households_import_batch_idx on public.households (import_batch_id) where import_batch_id is not null;
create index clients_import_batch_idx on public.clients (import_batch_id) where import_batch_id is not null;
create index policies_import_batch_idx on public.policies (import_batch_id) where import_batch_id is not null;
create index carriers_import_batch_idx on public.carriers (import_batch_id) where import_batch_id is not null;

-- clients has column-level grants (because of ssn_encrypted); the new column
-- needs explicit grants or staff queries that select it would fail.
grant select (import_batch_id) on public.clients to authenticated;
grant insert (import_batch_id) on public.clients to authenticated;
grant update (import_batch_id) on public.clients to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: import tables are owner/agent only — assistants get nothing, enforced
-- at the database, not just the UI.
-- ---------------------------------------------------------------------------

alter table public.import_batches enable row level security;
alter table public.import_mappings enable row level security;

create policy import_batches_rw on public.import_batches
  for all
  using (public.staff_role() in ('owner', 'agent'))
  with check (public.staff_role() in ('owner', 'agent'));

create policy import_mappings_rw on public.import_mappings
  for all
  using (public.staff_role() in ('owner', 'agent'))
  with check (public.staff_role() in ('owner', 'agent'));

-- The encrypted payload is never readable or writable through the API; it
-- only moves through the RPCs below.
revoke all on public.import_batches from anon, authenticated;
grant select (id, created_at, updated_at, uploaded_by, filename, sheet_name, status, mapping,
              options, row_count, created_households, created_clients, created_policies,
              created_carriers, updated_clients, skipped_rows, warning_rows, error_rows,
              finished_at, expires_at, report, undone_at, undone_by)
  on public.import_batches to authenticated;
grant insert (uploaded_by, filename, sheet_name, status, mapping, options, row_count, expires_at)
  on public.import_batches to authenticated;
grant update (sheet_name, status, mapping, options, row_count, created_households,
              created_clients, created_policies, created_carriers, updated_clients,
              skipped_rows, warning_rows, error_rows, finished_at, report)
  on public.import_batches to authenticated;

-- ---------------------------------------------------------------------------
-- Audit actions for imports.
-- ---------------------------------------------------------------------------

alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in ('view', 'create', 'update', 'delete', 'export',
                    'login', 'login_failed', 'link_opened', 'link_submitted',
                    'import_started', 'import_completed', 'import_undone'));

-- ---------------------------------------------------------------------------
-- Encrypted stash for parsed rows (owner/agent + uploader only, 30-min TTL).
-- ---------------------------------------------------------------------------

create or replace function public.import_stash_payload(p_batch_id uuid, p_payload jsonb, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.staff_role() not in ('owner', 'agent') then
    raise exception 'not authorized';
  end if;
  update public.import_batches
     set payload_encrypted = pgp_sym_encrypt(p_payload::text, p_key),
         expires_at = now() + interval '30 minutes'
   where id = p_batch_id and uploaded_by = auth.uid();
  if not found then
    raise exception 'batch not found';
  end if;
end $$;

create or replace function public.import_read_payload(p_batch_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_payload jsonb;
begin
  if public.staff_role() not in ('owner', 'agent') then
    raise exception 'not authorized';
  end if;
  select pgp_sym_decrypt(payload_encrypted, p_key)::jsonb into v_payload
    from public.import_batches
   where id = p_batch_id and expires_at > now() and payload_encrypted is not null;
  if v_payload is null then
    raise exception 'batch expired';
  end if;
  return v_payload;
end $$;

-- Drops payloads past their TTL (called opportunistically from the app).
create or replace function public.import_cleanup_expired()
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.staff_role() not in ('owner', 'agent') then
    raise exception 'not authorized';
  end if;
  update public.import_batches
     set payload_encrypted = null,
         status = case when status in ('uploaded', 'mapped') then 'expired' else status end
   where expires_at <= now() and payload_encrypted is not null;
end $$;

revoke execute on function public.import_stash_payload(uuid, jsonb, text) from public, anon;
revoke execute on function public.import_read_payload(uuid, text) from public, anon;
revoke execute on function public.import_cleanup_expired() from public, anon;

-- ---------------------------------------------------------------------------
-- Undo: deletes ONLY records this batch created that nobody touched after the
-- import finished, in one transaction. Updated records are never deleted;
-- clients that gained notes, documents, messages, links or responses are kept;
-- households are removed only once empty; carriers only when nothing else
-- references them. Owner only. The audit log is never touched.
-- ---------------------------------------------------------------------------

create or replace function public.admin_undo_import(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_batch public.import_batches%rowtype;
  v_cutoff timestamptz;
  v_policies int := 0;
  v_clients int := 0;
  v_households int := 0;
  v_carriers int := 0;
begin
  if public.staff_role() is distinct from 'owner' then
    raise exception 'only the owner can undo an import';
  end if;

  select * into v_batch from public.import_batches where id = p_batch_id for update;
  if v_batch.id is null then
    raise exception 'import not found';
  end if;
  if v_batch.status <> 'imported' then
    raise exception 'this import cannot be undone (status: %)', v_batch.status;
  end if;

  v_cutoff := coalesce(v_batch.finished_at, v_batch.created_at) + interval '2 seconds';

  -- Policies created by the batch and untouched since.
  with gone as (
    delete from public.policies p
     where p.import_batch_id = p_batch_id
       and p.updated_at <= v_cutoff
    returning 1
  ) select count(*) into v_policies from gone;

  -- Clients created by the batch, untouched since, with no remaining
  -- dependents (a surviving policy, note, document, message, or any
  -- verification history keeps the client).
  with gone as (
    delete from public.clients c
     where c.import_batch_id = p_batch_id
       and c.updated_at <= v_cutoff
       and not exists (select 1 from public.policies p where p.client_id = c.id)
       and not exists (select 1 from public.notes n where n.client_id = c.id)
       and not exists (select 1 from public.documents d where d.client_id = c.id)
       and not exists (select 1 from public.messages m where m.client_id = c.id)
    returning 1
  ) select count(*) into v_clients from gone;

  -- Households created by the batch that are now empty and have no
  -- verification history (responses are append-only and RESTRICT anyway).
  -- Deleting their clients above just set primary_client_id to null, which
  -- bumped updated_at to this transaction's timestamp — that update is ours,
  -- so updated_at = now() also counts as untouched.
  with gone as (
    delete from public.households h
     where h.import_batch_id = p_batch_id
       and (h.updated_at <= v_cutoff or h.updated_at = now())
       and not exists (select 1 from public.clients c where c.household_id = h.id)
       and not exists (select 1 from public.verification_responses vr where vr.household_id = h.id)
       and not exists (select 1 from public.notes n where n.household_id = h.id)
       and not exists (select 1 from public.documents d where d.household_id = h.id)
    returning 1
  ) select count(*) into v_households from gone;

  -- Carriers created by the batch with nothing referencing them any more.
  with gone as (
    delete from public.carriers ca
     where ca.import_batch_id = p_batch_id
       and not exists (select 1 from public.policies p where p.carrier_id = ca.id)
       and not exists (select 1 from public.commission_rates r where r.carrier_id = ca.id)
    returning 1
  ) select count(*) into v_carriers from gone;

  update public.import_batches
     set status = 'undone',
         undone_at = now(),
         undone_by = auth.uid(),
         payload_encrypted = null
   where id = p_batch_id;

  insert into public.audit_log (user_id, actor_type, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'staff', 'import_undone', 'import_batch', p_batch_id,
          jsonb_build_object('filename', v_batch.filename,
                             'deleted_policies', v_policies,
                             'deleted_clients', v_clients,
                             'deleted_households', v_households,
                             'deleted_carriers', v_carriers));

  return jsonb_build_object('policies', v_policies, 'clients', v_clients,
                            'households', v_households, 'carriers', v_carriers);
end $$;

revoke execute on function public.admin_undo_import(uuid) from public, anon;
