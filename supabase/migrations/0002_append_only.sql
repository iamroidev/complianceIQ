-- 0002_append_only.sql — MASTER §7.6/§8: audit blocks and evidence are
-- append-only in the DB. A BEFORE trigger rejects UPDATE/DELETE for every
-- role (including the table owner), and the privileges are revoked from the
-- API roles as defence in depth. Appends go through append_audit_block(),
-- which serialises writers with an advisory transaction lock.

create or replace function public.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists audit_blocks_append_only on public.audit_blocks;
create trigger audit_blocks_append_only
  before update or delete on public.audit_blocks
  for each row execute function public.reject_mutation();

drop trigger if exists evidence_items_append_only on public.evidence_items;
create trigger evidence_items_append_only
  before update or delete on public.evidence_items
  for each row execute function public.reject_mutation();

-- The REVOKE statements for both tables live at the end of 0003_rls.sql so
-- they land after the base table grants.

-- The single append path (§7.6): advisory lock, unique(block_index) on the PK.
create or replace function public.append_audit_block(
  p_block_index int,
  p_timestamp text,
  p_event_type text,
  p_actor text,
  p_alert_id text,
  p_payload jsonb,
  p_payload_hash text,
  p_previous_hash text,
  p_current_hash text
)
returns public.audit_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.audit_blocks;
begin
  perform pg_advisory_xact_lock(hashtext('complianceiq.audit_blocks.append'));
  insert into public.audit_blocks (
    block_index, timestamp, event_type, actor, alert_id,
    payload, payload_hash, previous_hash, current_hash
  ) values (
    p_block_index, p_timestamp, p_event_type, p_actor, p_alert_id,
    p_payload, p_payload_hash, p_previous_hash, p_current_hash
  )
  returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.append_audit_block(int, text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.append_audit_block(int, text, text, text, text, jsonb, text, text, text) to authenticated, service_role;
