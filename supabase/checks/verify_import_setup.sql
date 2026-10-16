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
