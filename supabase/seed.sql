-- seed.sql — three demo users (§8): officer, auditor, admin.
-- Public profiles only; the matching auth.users rows are created by the
-- auth signup flow, not by SQL (documented judgment call).
-- Fixed UUIDs so tests and demo links are stable.

insert into public.profiles (id, email, display_name, role) values
  ('11111111-1111-4111-8111-111111111111', 'officer@complianceiq.dev', 'Mara Osei', 'officer'),
  ('22222222-2222-4222-8222-222222222222', 'auditor@complianceiq.dev', 'Idris Bello', 'auditor'),
  ('33333333-3333-4333-8333-333333333333', 'admin@complianceiq.dev', 'Sofia Lindqvist', 'admin')
on conflict (id) do nothing;
