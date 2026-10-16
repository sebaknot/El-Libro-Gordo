-- Paste into the Supabase SQL editor to verify the import feature's database
-- setup. Everything should come back ✓.

-- 1) The four import functions must exist (plus log_audit + set_client_ssn_admin).
select p.proname as function,
       pg_get_function_identity_arguments(p.oid) as arguments,
       case when p.prosecdef then '✓ security definer' else '✗ NOT definer' end as definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('import_stash_payload', 'import_read_payload',
                     'import_cleanup_expired', 'admin_undo_import',
                     'log_audit', 'set_client_ssn_admin')
 order by p.proname;
-- Expect 6 rows. Missing import_* rows → re-run supabase/migrations/0003_import_batches.sql.

-- 2) authenticated must be able to execute the wizard RPCs.
select p.proname as function,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('import_stash_payload', 'import_read_payload', 'import_cleanup_expired', 'admin_undo_import');
-- Expect true for all four.

-- 3) The import tables and batch-id columns must exist.
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'import_batches' and column_name in ('id', 'status', 'payload_encrypted', 'report'))
     or (table_name in ('households', 'clients', 'policies', 'carriers') and column_name = 'import_batch_id'))
 order by table_name, column_name;
-- Expect 8 rows.

-- 4) The audit action constraint must accept the import actions.
select pg_get_constraintdef(oid) like '%import_started%' as audit_actions_extended
  from pg_constraint
 where conname = 'audit_log_action_check';
-- Expect true.

-- 5) authenticated column grants on import_batches (payload_encrypted must be absent).
select privilege_type, string_agg(column_name, ', ' order by column_name) as columns
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'import_batches' and grantee = 'authenticated'
 group by privilege_type;
-- payload_encrypted must NOT appear in any list.

-- 6) search_path on every pgcrypto-calling function must include "extensions"
--    (migration 0004). false → re-run 0004_pgcrypto_search_path.sql.
select p.proname as function,
       coalesce(array_to_string(p.proconfig, '; '), '(none)') as config,
       coalesce(array_to_string(p.proconfig, ';') ilike '%extensions%', false) as includes_extensions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('set_client_ssn', 'reveal_client_ssn', 'set_client_ssn_admin',
                     'import_stash_payload', 'import_read_payload')
 order by p.proname;
-- Expect includes_extensions = true for all five.

-- 7) Live encrypt/decrypt round-trip THROUGH the real import functions, using
--    dummy values only. Acts as the first active owner/agent for this one
--    transaction (the functions require a staff identity); creates a
--    temporary batch row and removes it again. Prints PASS or raises FAIL.
--    Nothing real is encrypted, logged, or left behind.
do $$
declare
  v_staff uuid;
  v_batch uuid;
  v_out jsonb;
begin
  select id into v_staff from public.users where role in ('owner', 'agent') and active limit 1;
  if v_staff is null then
    raise notice 'SKIP: create a staff account first, then re-run this check';
    return;
  end if;

  -- Impersonate that staff member for this transaction so staff_role() works
  -- (covers both claim formats auth.uid() reads).
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_staff::text, true);

  insert into public.import_batches (uploaded_by, filename, status)
  values (v_staff, 'pgcrypto-check (safe to ignore)', 'uploaded')
  returning id into v_batch;

  perform public.import_stash_payload(v_batch, '{"check":"ok"}'::jsonb, 'dummy-check-key');
  v_out := public.import_read_payload(v_batch, 'dummy-check-key');

  delete from public.import_batches where id = v_batch;

  if v_out ->> 'check' = 'ok' then
    raise notice 'PASS: pgcrypto encrypt/decrypt round-trip through the import functions works';
  else
    raise exception 'FAIL: decrypt returned an unexpected value';
  end if;
exception
  when others then
    -- Clean up the probe row even when the round-trip fails, then re-raise.
    if v_batch is not null then
      delete from public.import_batches where id = v_batch;
    end if;
    raise;
end $$;
