-- 0001_tables.sql — every table from MASTER §8.
-- Timestamps are stored as canonical ISO-8601 UTC ms text (the product's one
-- timestamp format, §7.6) so values round-trip byte-for-byte; nested domain
-- objects are jsonb.

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('officer', 'auditor', 'admin')),
  created_at text not null default to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

create table if not exists public.events (
  id text primary key,
  domain text not null check (domain in ('finance', 'people', 'vendor', 'access', 'identity', 'healthcare', 'expense', 'code', 'regulatory', 'ai')),
  actor jsonb not null,
  action text not null,
  resource jsonb not null,
  context jsonb not null,
  timestamp text not null,
  source text not null
);

create table if not exists public.people (
  id text primary key,
  name text not null,
  role text not null,
  department text not null,
  status text not null check (status in ('active', 'leave', 'terminated')),
  manager_id text
);

create table if not exists public.certifications (
  id text primary key,
  person_id text not null references public.people (id),
  type text not null,
  issuer text,
  issued_on text not null,
  expires_on text,
  evidence_id text
);

create table if not exists public.requirements (
  id text primary key,
  applies_to jsonb not null,
  cert_type text not null,
  criticality text not null check (criticality in ('standard', 'high')),
  obligation_id text not null
);

create table if not exists public.vendors (
  id text primary key,
  name text not null,
  tier text not null check (tier in ('critical', 'standard')),
  owner_id text not null,
  last_reviewed_on text
);

create table if not exists public.vendor_documents (
  vendor_id text not null references public.vendors (id) on delete cascade,
  position int not null,
  type text not null check (type in ('soc2_report', 'dpa', 'insurance', 'pen_test', 'contract')),
  valid_from text not null,
  expires_on text,
  evidence_id text,
  primary key (vendor_id, position)
);

create table if not exists public.accounts (
  id text primary key,
  person_id text not null references public.people (id),
  system text not null,
  privileged boolean not null,
  last_active_on text not null,
  mfa_enabled boolean not null
);

create table if not exists public.policy_documents (
  id text primary key,
  title text not null,
  kind text not null check (kind in ('internal_demo', 'regulation_summary', 'regulation_text')),
  version text not null,
  text text not null
);

create table if not exists public.policy_clauses (
  chunk_id text primary key,
  document_id text not null references public.policy_documents (id),
  regulation text not null,
  citation text not null,
  title text not null,
  text text not null,
  text_kind text not null check (text_kind in ('verbatim', 'summary')),
  source_url text
);

create table if not exists public.obligations (
  id text primary key,
  title text not null,
  plain_description text not null,
  kind text not null check (kind in ('recurring', 'deadline', 'threshold', 'requirement', 'prohibition')),
  source jsonb not null,
  cadence text check (cadence in ('monthly', 'quarterly', 'annual', 'once')),
  due_on text,
  last_completed_on text,
  owner_id text,
  status text not null check (status in ('proposed', 'confirmed', 'rejected')),
  origin text not null check (origin in ('manual', 'ai_extracted')),
  rule_ids jsonb not null,
  evidence_required jsonb
);

create table if not exists public.alerts (
  id text primary key,
  rule_id text not null,
  rule_version text not null,
  domain text not null check (domain in ('finance', 'people', 'vendor', 'access', 'identity', 'healthcare', 'expense', 'code', 'regulatory', 'ai')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  risk_score int not null,
  risk_reasons jsonb not null,
  summary_sentence text not null,
  subject jsonb not null,
  evidence_refs jsonb not null,
  snapshot_evidence_ids jsonb not null,
  result jsonb not null,
  policy_refs jsonb not null,
  status text not null check (status in ('open', 'in_review', 'filed', 'dismissed', 'escalated', 'resolved')),
  resolved_reason text check (resolved_reason in ('condition_cleared', 'decision')),
  assignee text,
  created_at text not null,
  sla_due_at text not null,
  draft_id text,
  explanation_id text
);

create table if not exists public.explanations (
  id text primary key,
  alert_id text not null references public.alerts (id),
  paragraphs jsonb not null,
  generated_by text not null check (generated_by in ('kimi', 'fixture', 'template'))
);

create table if not exists public.drafts (
  id text primary key,
  alert_id text not null references public.alerts (id),
  kind text not null check (kind in ('sar', 'soc2_deficiency', 'hipaa_4factor', 'te_disallowance', 'secure_sdlc_finding', 'exception_memo')),
  paragraphs jsonb not null,
  generated_by text not null check (generated_by in ('kimi', 'fixture', 'template')),
  created_at text not null
);

create table if not exists public.evidence_items (
  id text primary key,
  kind text not null check (kind in ('record_snapshot', 'event_set', 'document', 'check_run', 'decision', 'ci_log', 'agent_batch')),
  title text not null,
  source text not null,
  collected_at text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  content jsonb,
  content_ref text,
  subject_ref jsonb,
  ledger_block_index int not null
);

create table if not exists public.check_runs (
  id text primary key,
  as_of text not null,
  rules_run int not null,
  subjects_checked int not null,
  passed int not null,
  failed int not null,
  opened int not null,
  resolved int not null,
  ledger_block_index int not null
);

create table if not exists public.priority_suggestions (
  id text primary key,
  generated_at text not null,
  ranked_order jsonb not null,
  generated_by text not null check (generated_by in ('kimi', 'fixture', 'score-order'))
);

create table if not exists public.audit_blocks (
  block_index int primary key,
  timestamp text not null,
  event_type text not null check (event_type in ('CHECK_RUN', 'EVIDENCE_RECORDED', 'ALERT_TRIGGERED', 'ALERT_AUTO_RESOLVED', 'DRAFT_GENERATED', 'OBLIGATION_CONFIRMED', 'OFFICER_REVIEWED', 'OVERRIDE_RECORDED', 'REPORT_FILED', 'ALERT_DISMISSED', 'ALERT_ESCALATED', 'RESPONSE_EXECUTED', 'RESPONSE_REVERSED', 'AUDIT_PACK_EXPORTED')),
  actor text not null,
  alert_id text,
  payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  previous_hash text not null check (previous_hash ~ '^[0-9a-f]{64}$'),
  current_hash text not null check (current_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.response_settings (
  response_id text primary key,
  mode text not null check (mode in ('off', 'suggest', 'automatic')),
  updated_at text not null,
  updated_by text
);

create table if not exists public.source_connections (
  id text primary key,
  kind text not null,
  status text not null,
  config jsonb not null default '{}'::jsonb,
  last_synced_at text
);
