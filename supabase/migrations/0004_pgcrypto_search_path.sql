-- El Libro Gordo — fix pgcrypto resolution in SECURITY DEFINER functions.
-- Run after 0003_import_batches.sql. Idempotent; safe to re-run.
--
-- On Supabase, pgcrypto is installed in the "extensions" schema. Our
-- SECURITY DEFINER functions pinned search_path = public (correct hygiene),
-- which made pgp_sym_encrypt/pgp_sym_decrypt unresolvable at runtime:
--   42883 function pgp_sym_encrypt(text, text) does not exist
-- Appending "extensions" fixes resolution; Postgres silently skips schemas
-- that don't exist, so this also works on databases where pgcrypto was
-- installed into public.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (p.prosrc ~* 'pgp_sym_(encrypt|decrypt)'
         or p.prosrc ~* '\mgen_salt\M'
         or p.prosrc ~* '\mgen_random_bytes\M')
  loop
    execute format('alter function %s set search_path = public, extensions', f.signature);
    raise notice 'search_path fixed on %', f.signature;
  end loop;
end $$;
