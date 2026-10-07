-- 0004_app_state.sql — M15 Phase C: durable runtime state + reset_demo().
-- The engine's tables hold the record; this single row holds what used to
-- live only in process memory: the FakeClock time, the JS-seeded registers
-- (people/obligations/…) and the response modes. One row, id = true.

create table if not exists public.app_state (
  id boolean primary key default true,
  clock_at text not null,
  registers jsonb not null,
  response_settings jsonb not null,
  updated_at timestamptz not null default now()
);

-- Server-owned runtime state: RLS enabled with no policies, so only the
-- service role (which bypasses RLS) and the table owner can touch it.
alter table public.app_state enable row level security;

-- One call wipes the record so a demo reset or scenario starts from a clean
-- slate — this is what replaces the old memory-only guard (M15 Phase C).
-- TRUNCATE bypasses the per-row append-only triggers in 0002 on purpose: a
-- sanctioned reset is the one wipe the schema allows. profiles survives
-- (the three demo users are seeded by seed.sql).
create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table
    public.alerts,
    public.explanations,
    public.drafts,
    public.evidence_items,
    public.check_runs,
    public.priority_suggestions,
    public.audit_blocks,
    public.events,
    public.people,
    public.certifications,
    public.requirements,
    public.vendors,
    public.vendor_documents,
    public.accounts,
    public.obligations,
    public.policy_documents,
    public.policy_clauses,
    public.response_settings,
    public.source_connections,
    public.app_state
    restart identity cascade;
end;
$$;

revoke execute on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to service_role;
