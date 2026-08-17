-- El Libro Gordo — safe household deletion (owner only)
-- Run after 0001_schema.sql.
--
-- verification_responses is append-only (trigger raises on DELETE) and its
-- household_id FK is ON DELETE RESTRICT, so household deletion is impossible
-- through plain table deletes. This migration:
--   1. lets the guard allow DELETE only inside the cascade below (a
--      transaction-local setting no ordinary request sets), and
--   2. adds admin_delete_household(): a security-definer RPC that removes a
--      household and everything scoped to it in ONE transaction, in FK
--      dependency order, after writing an audit_log row. The audit log
--      itself is never touched — history survives the deletion.

create or replace function public.verification_responses_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('app.cascade_household_delete', true) = 'on' then
      return old;
    end if;
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

create or replace function public.admin_delete_household(p_household_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if public.staff_role() is distinct from 'owner' then
    raise exception 'only the owner can delete a household';
  end if;

  select household_name into v_name from public.households where id = p_household_id;
  if v_name is null then
    raise exception 'household not found';
  end if;

  -- Audit the deletion first (same transaction; rolls back if anything fails).
  insert into public.audit_log (user_id, actor_type, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'staff', 'delete', 'household', p_household_id,
          jsonb_build_object('household_name', v_name));

  -- Transaction-local flag the verification_responses guard checks.
  perform set_config('app.cascade_household_delete', 'on', true);

  delete from public.commission_payments
   where policy_id in (select id from public.policies where household_id = p_household_id);
  delete from public.policies where household_id = p_household_id;
  delete from public.documents
   where household_id = p_household_id
      or client_id in (select id from public.clients where household_id = p_household_id);
  delete from public.notes
   where household_id = p_household_id
      or client_id in (select id from public.clients where household_id = p_household_id);
  delete from public.messages
   where client_id in (select id from public.clients where household_id = p_household_id);
  delete from public.verification_responses where household_id = p_household_id;
  delete from public.verification_links where household_id = p_household_id;
  delete from public.renewal_pipeline where household_id = p_household_id;
  delete from public.tasks
   where household_id = p_household_id
      or client_id in (select id from public.clients where household_id = p_household_id);

  -- clients.household_id is ON DELETE RESTRICT: clients go before the household.
  update public.households set primary_client_id = null where id = p_household_id;
  delete from public.clients where household_id = p_household_id;
  delete from public.households where id = p_household_id;
end $$;

revoke execute on function public.admin_delete_household(uuid) from public, anon;
