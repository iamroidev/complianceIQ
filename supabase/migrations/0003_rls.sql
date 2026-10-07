-- 0003_rls.sql — MASTER §8: RLS on every table; officer/auditor/admin;
-- auditor reads but never decides; admin owns response modes and settings;
-- audit_blocks and evidence_items can never be updated or deleted.

create or replace function public.app_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'role',
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'anon'
  );
$$;

do $$
declare
  t text;
  all_tables text[] := array[
    'profiles', 'events', 'people', 'certifications', 'requirements', 'vendors',
    'vendor_documents', 'accounts', 'policy_documents', 'policy_clauses',
    'obligations', 'alerts', 'explanations', 'drafts', 'evidence_items',
    'check_runs', 'priority_suggestions', 'audit_blocks', 'response_settings',
    'source_connections'
  ];
begin
  foreach t in array all_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I_select on public.%I for select using (public.app_role() in (''officer'', ''auditor'', ''admin''))',
      t, t
    );
  end loop;
end;
$$;

-- Tables an officer may add rows to (and an admin may reset); the engine
-- writes with the service role, which bypasses RLS.
do $$
declare
  t text;
  officer_insert text[] := array[
    'events', 'people', 'certifications', 'requirements', 'vendors',
    'vendor_documents', 'accounts', 'obligations', 'policy_documents',
    'policy_clauses', 'check_runs', 'explanations', 'drafts', 'priority_suggestions'
  ];
begin
  foreach t in array officer_insert loop
    execute format(
      'create policy %I_insert on public.%I for insert with check (public.app_role() in (''officer'', ''admin''))',
      t, t
    );
  end loop;
end;
$$;

-- Registers, policy text and drafts are editable by officer and admin only.
do $$
declare
  t text;
  officer_update text[] := array[
    'people', 'certifications', 'requirements', 'vendors', 'vendor_documents',
    'accounts', 'obligations', 'policy_documents', 'policy_clauses', 'drafts'
  ];
begin
  foreach t in array officer_update loop
    execute format(
      'create policy %I_update on public.%I for update using (public.app_role() in (''officer'', ''admin'')) with check (public.app_role() in (''officer'', ''admin''))',
      t, t
    );
  end loop;
end;
$$;

-- Decisions (File / Dismiss / Escalate): officer and admin; auditor can
-- never change a decision ("cannot decide", §8). Alerts are inserted only
-- by the engine (service role) — no user insert policy on purpose.
create policy alerts_update on public.alerts
  for update using (public.app_role() in ('officer', 'admin'))
  with check (public.app_role() in ('officer', 'admin'));

-- Officer evidence uploads (§7.5); nothing may ever update or delete them.
create policy evidence_items_insert on public.evidence_items
  for insert with check (public.app_role() in ('officer', 'admin'));

-- Demo users are seeded/managed by admins.
create policy profiles_insert on public.profiles
  for insert with check (public.app_role() = 'admin');
create policy profiles_update on public.profiles
  for update using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- Response modes and source connections are admin-only (§7.9, §10).
create policy response_settings_admin on public.response_settings
  for insert with check (public.app_role() = 'admin');
create policy response_settings_admin_update on public.response_settings
  for update using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');
create policy source_connections_admin on public.source_connections
  for insert with check (public.app_role() = 'admin');
create policy source_connections_admin_update on public.source_connections
  for update using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

-- Defence in depth (§8): the API roles lose UPDATE/DELETE outright on the
-- two append-only tables; the trigger in 0002 still rejects every role,
-- including the table owner.
revoke update, delete on public.audit_blocks from anon, authenticated;
revoke update, delete on public.evidence_items from anon, authenticated;
