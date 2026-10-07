# ComplianceIQ — MASTER.md (v0.2)

**Single entry point for the build. Read this, then DESIGN.md, before writing code.**
Status: **approved for build** (v0.2). Scope: **all tiers, in phases** — Tier 1 (M0–M13) first and accepted before Tier 2 starts; Tier 2 (T1–T2) before Tier 3 (T3–T4). Owner approves each phase transition. Remaining open decisions are in §16.
Project: *ComplianceIQ: an automated compliance monitoring and auditing system* (final-year project, University of Mines and Technology).
Repo: `c:\Users\richi\Desktop\complianceIQ`

---

## 0. Agent rules

1. **Authority.** This file for behaviour, data, tests, process. `DESIGN.md` for everything visual and every word users see. Older plan files are background only.
2. **Milestones in order (§12).** Stop at every `GATE` and wait for the owner. Tiers (§1.3) decide what is built; never start Tier 2 or 3 before Tier 1 is accepted.
3. **No scope creep.** Anything not here is out of scope (§13). Ask instead of guessing.
4. **Never fabricate legal text or claim compliance** (§1.4, §6.4).
5. **The demo must work offline** (§9).
6. After each milestone: `pnpm typecheck && pnpm lint && pnpm test`, update `PROGRESS.md`, commit `M<n>: <summary>`. Never weaken a test to make it pass.
7. **AI boundary (most important rule).** Rules produce verdicts, risk scores, SLAs and statuses. AI may only *explain, draft, extract, suggest and propose*. Every AI output is untrusted: it passes a validator or is replaced by a deterministic fallback, and it is labelled "AI-assisted" in the UI. AI output never changes a verdict, score, SLA or ledger content on its own.

---

## 1. What we are building

### 1.1 Pitch
ComplianceIQ **automatically checks whether a company is following its own policies and the regulations it must meet**, continuously, and produces audit-ready evidence. A deterministic rules engine runs the checks (expired certifications, financial thresholds, regulatory deadlines, data access, vendor requirements, separation of duties, secrets in code). An AI layer helps people understand the results: it explains why something was flagged using the exact policy wording, reads policies to find obligations that have no automated check, suggests what to look at first, and drafts reports. Every decision and every piece of evidence is recorded in a tamper-evident audit record.

It is not a dashboard. It automates the checking, the evidence collection, and the report writing.

### 1.2 Gaps this project targets
Competitor statements below come from public positioning and general knowledge. **Verify against current product pages before the defense**, and be fair: Vanta and Drata do cover vendor management, security training tracking, policy templates and have AI features. Our claims must be narrow and demonstrable.

| # | Gap | What commercial GRC tools typically do | What ComplianceIQ does | Tier |
|---|---|---|---|---|
| G1 | **Your own policies become executable checks** | Map recognised frameworks (SOC 2, ISO 27001) to prebuilt tests; bespoke internal policies stay as documents and manual attestations | AI extracts obligations from policy text with the exact quote; a person confirms; each obligation is mapped to a rule or shown as a **coverage gap** | 1 |
| G2 | **Business obligations beyond IT** in one engine | Strong on cloud/IT controls; shallow or absent for professional certifications, regulatory calendars, payment approval limits, financial thresholds | Same rules and evidence model for people, vendors, deadlines, payments, data access, code | 1 |
| G3 | **Explanations tied to exact policy text, mechanically verified** | AI drafts and suggestions, citations not machine-verified | Every explanation cites clause ids that are validated against the corpus; numbers must match evidence | 1 |
| G4 | **Explainable risk ranking** | Opaque scores or severity labels | Deterministic score with plain reasons is authoritative; an AI "suggested order" is advisory and shows where it differs | 1 |
| G5 | **Tamper-evident decisions and evidence index** | Decisions and evidence live in mutable databases, auditors take them on trust | Hash-chained audit record; head hash in every export so an auditor can re-verify | 1 |
| G6 | **Continuous, both directions** | Periodic polling; failures flagged | Scheduled checks open **and auto-close** alerts with evidence; each check run is itself recorded as proof monitoring happened | 1 |
| G7 | **Runtime behaviour next to scheduled state checks** | Mostly configuration at rest | Event stream rules (transactions, access, commits) plus scheduled register checks | 1 |
| G8 | **Questionnaire answers backed by evidence hashes** | AI autofill from policies | Parse messy `.xlsx`, answer only from confirmed obligations and evidence, cite evidence hash and last-verified date, say "no evidence" otherwise | 2 |
| G9 | **Software supply chain gate with evidence** | Rare, usually separate tools | CI gate blocks on secrets and licence violations, logs block/fix to the evidence locker | 2 |
| G10 | **On-prem evidence agent** | Agents exist for endpoint posture | Small Go agent hashes and signs local config evidence; server verifies signature | 3 |
| G11 | **Closed-loop remediation with approval and undo** | Mostly alerting and tickets | AI proposes a plan from an allowlist, a person approves, deterministic executor acts, access restores automatically when the condition clears | 3 |
| G12 | **AI system governance** (EU AI Act, ISO 42001 readiness) | Emerging, mostly questionnaires | Rules over a model/dataset registry: PII scan before training, evaluation before deployment, provenance, drift | 3 |

### 1.3 Scope tiers (decide scope by tier, not by enthusiasm)
- **Tier 1: must ship, done well.** Registers, event rules and scheduled state rules, scheduler with time travel, evidence locker, ledger, policy library with obligations and coverage, AI layer (explain, extract, suggest order, draft), human decisions, audit pack export, full UI, landing page, offline demo.
- **Tier 2: ship if time allows, in this order.** CI/CD gate (GitHub Action and CLI), questionnaire responder.
- **Tier 3: stretch, mock acceptable.** Go agent, agentic remediation, AI-system governance domain.

**Phasing (owner decision):** all three tiers are in scope, delivered in phases. Phase 1 = Tier 1 (M0–M13). Phase 2 = Tier 2 (T1, T2). Phase 3 = Tier 3 (T3, T4). A phase starts only after the previous phase's gates are accepted.

### 1.4 Honest-claims rules (UI, README, report)
- Say "tamper-evident", never "SEC 17a-4 / FINRA compliant". Hash-chaining supports tamper-evident record keeping; real retention and WORM storage are out of scope. State this on the architecture page.
- Say "SAR-style draft", never "filed with FinCEN". Exports are drafts in our own format.
- Demo connections, sample sanctions list and demo policies are labelled as such.
- "Readiness" and "checks", never "compliant with the EU AI Act" or "certified".

---

## 2. Architecture

```
 Event sources (scenarios, seed streams, CI gate, agent)        Registers (people, certifications, requirements,
            │ POST /api/events                                   vendors, accounts, obligations, models)
            ▼                                                              │ scheduled
   ┌───────────────────┐                                           ┌───────────────────┐
   │ Ingest + validate │                                           │ Scheduler (Clock) │ run-checks(asOf)
   └─────────┬─────────┘                                           └─────────┬─────────┘
             └──────────────────────────┬──────────────────────────────────┘
                                        ▼
                        ┌──────────────────────────────┐
                        │ Deterministic rules engine   │ event rules + state rules → RuleResult
                        └──────────────┬───────────────┘
                                       ▼
        Evidence locker (snapshot + hash) ──► Alert (score, SLA, reasons) ──► Ledger block
                                       ▼
                        ┌──────────────────────────────┐
                        │ Policy retrieval             │ mapped clauses (guaranteed) + semantic extras
                        └──────────────┬───────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │ AI layer (advisory, validated)│ explain · draft · extract obligations ·
                        │ fallback: deterministic       │ gap suggestions · suggested order
                        └──────────────┬───────────────┘
                                       ▼
                 Human decision (File / Dismiss with reason / Escalate) ──► Ledger block
                                       ▼
                 Audit pack export (results, evidence index, decisions, coverage, head hash)
```

Key decisions (be ready to defend):
- Detection and scoring are pure code: same input, same output. Time comes from an injected `Clock`.
- **Two rule kinds:** *event rules* (look at a stream: deposits, commits, record views) and *state rules* (look at registers as of a date: certifications, vendors, deadlines, accounts).
- **Evidence is snapshotted at detection time** (content hash stored). Later edits to a register cannot rewrite what the alert was based on.
- Citations are guaranteed by a **rule→clause mapping**; semantic search only adds extras.
- Storage sits behind a `Repo` interface: `InMemoryRepo` (tests, offline demo) and `SupabaseRepo` (deployed).
- Alerts from state rules **auto-resolve** when the condition clears (renewed certification, delivered document), with a ledger block and evidence.

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict, pnpm |
| Styling | Tailwind CSS v4 + `tokens.css` (see DESIGN.md §3 — Mist default, 60/30/10 palettes), lucide-react 16px |
| Motion | `motion` (Framer Motion) for UI; GSAP + ScrollTrigger on the landing page only; no WebGL, no smooth-scroll libraries |
| Illustration | Hand-composed React SVG kit (no stock or AI-generated art), see DESIGN.md §16 |
| Design QA | axe-core in Playwright, Lighthouse CI, Playwright frame captures for motion |
| Validation | zod for API input and all AI output |
| DB/Auth | Supabase (Postgres, Auth, RLS); optional at demo time |
| AI | **Kimi (Moonshot AI)** — OpenAI-compatible API, structured JSON output, temperature 0, base URL from `KIMI_BASE_URL`, model from `KIMI_MODEL`. Behind the `AI_MODE` switch; the demo runs on fixtures with no key. |
| Embeddings | Precomputed at build into `src/data/policy/embeddings.json`; runtime is local cosine similarity |
| Hashing | Node `crypto` SHA-256 (server only) |
| Spreadsheets | `exceljs` (Tier 2 responder, report exports) |
| PDF | `@react-pdf/renderer` or `pdf-lib` (pick one) |
| Tests | Vitest, Playwright |
| Deploy | Vercel + Supabase |
| Agent (Tier 3) | Go single binary, Ed25519 |

Env vars (`.env.example`, no secrets committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `KIMI_API_KEY`, `KIMI_BASE_URL`, `KIMI_MODEL`, `DATA_MODE` (`memory`|`supabase`), `AI_MODE` (`live`|`fixtures`|`off`), `RESPONSES_LIVE` (default false), `CI_GATE_TOKEN`.

---

## 4. Repository layout

```
src/
  app/
    (marketing)/page.tsx
    (app)/ overview/ alerts/ alerts/[id]/ audit-record/ policy-coverage/ obligations/
           registers/people/ registers/vendors/ deadlines/ evidence/ rules/ policies/
           reports/ sources/ responses/ settings/
           questionnaires/ (Tier 2)  ci-gate/ (Tier 2)  training-readiness/ (Tier 3)
    api/ events/ alerts/ alerts/[id]/{draft,decision,explain}/ checks/run/ demo/{scenario/[id],advance-time,reset}/
         registers/[kind]/ obligations/{route,extract,[id]/confirm}/ coverage/ priority/
         evidence/ evidence/[id]/ ledger/ ledger/verify/ reports/audit-pack/ export/sar/[id]/
         ci/gate/ (T2)  questionnaires/ (T2)  agent/ingest/ (T3)
  core/
    types/ clock/ ledger/ evidence/ scheduler/
    engine/ evaluators/ rules/event/ rules/state/ evaluate.ts risk.ts
    rag/ corpus.ts retrieve.ts mapping.ts validate-citations.ts
    ai/  explain.ts draft.ts extract-obligations.ts gap-suggest.ts priority.ts prompts.ts
         validators/ (citations, facts, quotes, ids, forbidden-claims)  fallbacks/  fixtures-loader.ts
    coverage/ compute.ts
    pipeline/ process-event.ts run-checks.ts decide.ts
    reports/ audit-pack.ts dossiers/
    responses/ response-rules.ts executor.ts
    repo/ repo.ts memory-repo.ts supabase-repo.ts
    questionnaire/ (T2) parse.ts match.ts fill.ts
    ci-gate/ (T2) secrets.ts licences.ts
    agent-mock/ (T3)  ai-governance/ (T3)
  data/
    policy/ clauses.json mapping.json embeddings.json documents/*.md (demo internal policies)
    rules/ meta + sod-matrix.json
    seed/ people.json certifications.json requirements.json vendors.json accounts.json obligations.json events/
    scenarios/ *.json (each with a negative-control twin)
    fixtures/ ai/ (pre-generated AI outputs per scenario)
    sanctions-sample.json
  components/ ui/ signature/ workspace/ marketing/ illustration/kit/ illustration/scenes/ motion/
  styles/tokens.css
agent/            (T3) Go source
ci/               (T2) action.yml, ciq-gate CLI
scripts/          precompute-embeddings.ts generate-fixtures.ts tamper-db.ts seed.ts
supabase/migrations/
tests/ unit/ e2e/
DESIGN.md MASTER.md PROGRESS.md docs/defense.md
```

---

## 5. Data contracts (zod schemas in `core/types`; export TS types from zod)

```ts
type Domain = 'finance' | 'people' | 'vendor' | 'access' | 'identity' | 'healthcare' | 'expense' | 'code' | 'regulatory' | 'ai';
type EvidenceRef = { type: 'event' | 'record' | 'evidence'; id: string };

// ---------- Streams ----------
interface ComplianceEvent {
  id: string; domain: Domain;
  actor: { id: string; name: string; role: string };
  action: string;                       // cash_deposit, payment_released, commit_code, deploy_prod, view_record, submit_expense, dependency_scan…
  resource: { type: string; id: string; label?: string; attributes?: Record<string, unknown> };
  context: Record<string, unknown>;
  timestamp: string;                    // ISO-8601 UTC ms
  source: string;
}

// ---------- Registers (state rules read these) ----------
interface Person        { id; name; role; department; status: 'active'|'leave'|'terminated'; managerId? }
interface Certification { id; personId; type; issuer?; issuedOn; expiresOn?; evidenceId? }
interface Requirement   { id; appliesTo: { role?: string; department?: string }; certType; criticality: 'standard'|'high'; obligationId }
interface VendorDocument{ type: 'soc2_report'|'dpa'|'insurance'|'pen_test'|'contract'; validFrom; expiresOn?; evidenceId? }
interface Vendor        { id; name; tier: 'critical'|'standard'; ownerId; documents: VendorDocument[]; lastReviewedOn? }
interface Account       { id; personId; system; privileged: boolean; lastActiveOn; mfaEnabled: boolean }
interface Registers     { people; certifications; requirements; vendors; accounts; obligations; (T3) models?; datasets? }

// ---------- Policy and obligations ----------
interface PolicyDocument { id; title; kind: 'internal_demo'|'regulation_summary'|'regulation_text'; version; text }
interface PolicyClause   { chunkId; documentId; regulation; citation; title; text; textKind: 'verbatim'|'summary'; sourceUrl? }
interface Obligation {
  id; title; plainDescription;
  kind: 'recurring'|'deadline'|'threshold'|'requirement'|'prohibition';
  source: { documentId; chunkId?; quote; quoteSpan: [number, number] };   // exact substring of the document
  cadence?: 'monthly'|'quarterly'|'annual'|'once'; dueOn?: string; lastCompletedOn?: string; ownerId?: string;
  status: 'proposed'|'confirmed'|'rejected';
  origin: 'manual'|'ai_extracted';
  ruleIds: string[];                    // empty = no automated check
  evidenceRequired?: string[];
}
interface CoverageItem { obligationId; status: 'covered'|'partial'|'gap'; ruleIds: string[]; lastPassedAt?: string; reason: string }

// ---------- Rules and alerts ----------
type Severity = 'critical'|'high'|'medium'|'low';
interface RuleContext { events: ComplianceEvent[]; registers: Registers; asOf: string }   // asOf from Clock
interface RuleResult {
  ruleId; ruleVersion; verdict: 'pass'|'fail';
  subject: { id; name };
  triggeringRefs: EvidenceRef[];
  observed: Record<string, number|string|boolean>;
  parameters: Record<string, number|string|boolean>;
}
interface Alert {
  id; ruleId; ruleVersion; domain: Domain; severity: Severity;
  riskScore: number; riskReasons: string[];            // top 3, plain English
  summarySentence: string;                             // deterministic
  subject: { id; name }; evidenceRefs: EvidenceRef[]; snapshotEvidenceIds: string[];
  result: RuleResult; policyRefs: PolicyRef[];
  status: 'open'|'in_review'|'filed'|'dismissed'|'escalated'|'resolved';
  resolvedReason?: 'condition_cleared' | 'decision';
  assignee?; createdAt; slaDueAt; draftId?; explanationId?;
}
interface PolicyRef { chunkId; reason: 'mapped'|'semantic'; confidence: number; highlightSpan?: [number, number] }

// ---------- Evidence ----------
interface EvidenceItem {
  id: string;                            // ev_...
  kind: 'record_snapshot'|'event_set'|'document'|'check_run'|'decision'|'ci_log'|'agent_batch';
  title: string; source: string; collectedAt: string;
  contentHash: string;                   // sha256(canonical(content))
  content?: unknown; contentRef?: string; subjectRef?: EvidenceRef;
  ledgerBlockIndex: number;
}
interface CheckRun { id; asOf; rulesRun: number; subjectsChecked: number; passed: number; failed: number; opened: number; resolved: number; ledgerBlockIndex: number }

// ---------- AI outputs (all stored, all validated) ----------
interface Explanation { id; alertId; paragraphs: Paragraph[]; generatedBy: 'kimi'|'fixture'|'template' }
interface Draft       { id; alertId; kind: DossierKind; paragraphs: Paragraph[]; generatedBy: 'kimi'|'fixture'|'template'; createdAt }
type DossierKind = 'sar'|'soc2_deficiency'|'hipaa_4factor'|'te_disallowance'|'secure_sdlc_finding'|'exception_memo';
interface Paragraph { id; heading?; text; citations: string[]; evidenceRefs: EvidenceRef[]; origin: 'ai'|'template'|'edited' }
interface GapSuggestion { id; obligationId?; documentId; text; citedQuote: string; suggestedCheck: string; generatedBy }      // advisory, never counts as a confirmed gap
interface PrioritySuggestion { id; generatedAt; order: { alertId; rank: number; reason: string; citedFacts: string[] }[]; generatedBy: 'kimi'|'fixture'|'score-order' }

// ---------- Ledger ----------
type LedgerEventType = 'CHECK_RUN'|'EVIDENCE_RECORDED'|'ALERT_TRIGGERED'|'ALERT_AUTO_RESOLVED'|'DRAFT_GENERATED'
  |'OBLIGATION_CONFIRMED'|'OFFICER_REVIEWED'|'OVERRIDE_RECORDED'|'REPORT_FILED'|'ALERT_DISMISSED'|'ALERT_ESCALATED'
  |'RESPONSE_EXECUTED'|'RESPONSE_REVERSED'|'AUDIT_PACK_EXPORTED';
interface AuditBlock { blockIndex; timestamp; eventType; actor; alertId?; payload; payloadHash; previousHash; currentHash }
```

UI names for `LedgerEventType` live in one map (`core/ledger/labels.ts`), e.g. `ALERT_AUTO_RESOLVED` → "Alert closed automatically". Components never print raw enums.

---

## 6. Rules, severity, policy

### 6.1 Rule catalog
Rule signature: `evaluate(ctx: RuleContext, params) => RuleResult[]`. Every rule file exports `meta`, `defaultParams`, `evaluate`, `riskFactors`, `summarize(result)` (deterministic plain sentence), `kind: 'event'|'state'`.

| ID | Tier | Kind | Detects | Parameters (defaults) | Severity | Dossier |
|---|---|---|---|---|---|---|
| AML-001 | 1 | event | Structuring: same subject, ≥2 cash deposits each in band, cumulative ≥ limit, inside rolling window | band 9,000.00–9,999.99 USD; window 48h; minCount 2; limit 10,000.00 | high (critical if ≥3 deposits or sum ≥ 25,000) | sar |
| FIN-001 | 1 | event | Payment released above approval limit without required distinct approvers | ≥5,000 USD needs 1 approver who is not the requester; ≥25,000 needs 2 distinct approvers | high | exception_memo |
| IAM-001 | 1 | event | Separation of duties: same actor committed code and changed prod without another approver | window 24h; `sod-matrix.json` | high | soc2_deficiency |
| HIPAA-001 | 1 | event | Restricted patient record viewed by someone not on the care team | restricted flag; care-team list | high | hipaa_4factor |
| DEV-001 | 1 | event | Hardcoded secret in commit: provider regex + entropy | AWS access key, AWS secret, generic key; entropy ≥ 3.5 | critical | secure_sdlc_finding |
| CERT-001 | 1 | state | Active person whose role requires a certification and has no valid one at `asOf` | graceDays 0 | by requirement criticality: high / medium | exception_memo |
| DEAD-001 | 1 | state | Obligation due within warning window with no completion evidence (warning), or past due (breach) | warningDays 14 | medium (warning), critical (past due) | exception_memo |
| VEND-001 | 1 | state | Vendor missing or expired a required document for its tier | critical: soc2_report, dpa, insurance; standard: dpa | high (critical vendor), medium | exception_memo |
| CERT-002 | 2 | state | Certification expires within warning window | warningDays 30 | low (medium if criticality high) | exception_memo |
| VEND-002 | 2 | state | Critical vendor not reviewed within period | reviewMonths 12 | medium | exception_memo |
| IAM-002 | 2 | state | Privileged account inactive too long | inactiveDays 60 | medium | soc2_deficiency |
| IAM-003 | 2 | state | Privileged account without MFA | none | critical | soc2_deficiency |
| EXP-001 | 2 | event | Split invoicing: ≥2 receipts, same vendor and amount, same employee, each under limit, within window, combined ≥ limit | limit 1,000.00 USD; window 2h | medium | te_disallowance |
| AML-002 | 2 | event | Velocity outlier: 24h outflow > 3× 30-day daily baseline | multiplier 3.0; minimum 7 days data | medium | sar |
| AML-003 | 2 | event | Sanctions name near-match (Jaro-Winkler) against sample list | threshold 0.92; normalise case, punctuation, diacritics | critical | sar |
| DEV-002 | 2 | event | Dependency licence on deny list in a dependency scan | deny: AGPL-3.0, GPL-3.0 (configurable); allowlist overrides | high | secure_sdlc_finding |
| AI-001…004 | 3 | state | Training run with unscanned dataset; model in production without evaluation; drift above threshold; dataset without provenance | thresholds in meta | high | exception_memo |

**Boundary and negative cases are mandatory (§11).** Examples: certification expiring *today* is still valid, expired *yesterday* fails; deposits of 8,900 do not fire AML-001; 49h apart do not fire; vendor document expiring tomorrow passes VEND-001 but is visible in the deadlines view.

### 6.2 Risk score (authoritative, deterministic, explainable)
`riskScore = clamp(0, 100, base(ruleId) + Σ factorPoints)`. Rules declare factors with points and plain reasons (AML-001: +10 per extra deposit, +15 if sum ≥ 2× limit, +10 if subject has a prior alert in 90 days; CERT-001: +15 if high criticality, +10 per 30 days overdue up to +30, +10 if person has privileged access). `riskReasons` = top 3 triggered factors in plain English. Score bands may raise severity above the rule default, never lower it. **AI never alters this.**

### 6.3 SLA
critical 4h · high 24h · medium 72h · low 7 days, measured on the injected clock.

### 6.4 Policy corpus rules
- US government text (CFR, HHS) only verbatim if certain it is exact; otherwise a summary. Mark `textKind`. UI says "Summary of …" or "Text of …".
- **SOC 2 criteria, ISO standards, EU AI Act commentary: summaries only** (copyright and accuracy).
- NIST SP 800-53 control IDs and short descriptions are fine.
- **Internal demo policies are our own invented documents, written in full as Markdown** in `data/policy/documents/`, labelled "Demo policy document": Training and Certification Policy, Vendor Management Policy, Payment Approval Policy, Regulatory Calendar, Access Control Policy, AML Procedure, Secure Development Standard, Travel and Expense Policy.
- **Design the demo policies on purpose:** each contains 6–10 obligations; roughly 75% map to a Tier 1 rule; the rest have **no rule** (for example "access reviews must be completed every January", "vendors must be offboarded within 30 days of contract end"). These produce the coverage-gap demo moment.
- Never invent a clause number. Allowed set is `clauses.json`. Additions need a source URL.
- Minimum regulatory set: 31 CFR § 1020.320 (summary), 31 U.S.C. § 5324 (summary), 45 CFR § 164.502(b), 45 CFR § 164.402 (summary), SOC 2 CC6.1/CC6.3/CC6.8 (summaries), NIST 800-53 AC-5, AC-2, SA-11, IA-5(7).

### 6.5 Rule→clause mapping
`mapping.json` maps every rule to ≥1 `chunkId` (clauses or internal policy sections). This is the guaranteed legal basis. Retrieval adds ≤2 semantic matches above confidence 0.55.

---

## 7. Behaviour specs

### 7.1 Summary sentence
Deterministic, from `summarize()`, with real values. Examples: "Kofi Adjei-Boateng made 2 cash deposits of USD 9,800.00 and USD 9,400.00 within 34 hours, each just under the USD 10,000 reporting limit." · "Ama Serwaa Owusu's First Aid certificate expired on 12 Mar 2026, 19 days ago. Her role requires it."

### 7.2 Event pipeline (`process-event`)
1. Validate, store event. 2. Load history window. 3. Run event rules for the domain. 4. For each failing result not already alerted (dedupe key = ruleId + subject + sorted evidence refs): snapshot evidence into the locker, create Alert, score, SLA. 5. Ledger: `EVIDENCE_RECORDED`, `ALERT_TRIGGERED`. 6. Retrieve policy refs. 7. Generate explanation and draft (§7.4). 8. Evaluate response rules (§7.9). Idempotent per event id.

### 7.3 Scheduled checks (`run-checks(asOf)`)
1. Load registers as of `asOf`. 2. Run every enabled state rule for every relevant subject. 3. For each failure not already open: snapshot, alert, ledger (as above). 4. For each open state-rule alert whose condition no longer fails: set `resolved`, `resolvedReason: 'condition_cleared'`, store the new evidence snapshot, ledger `ALERT_AUTO_RESOLVED`. 5. Store a `CheckRun` and append ledger `CHECK_RUN` with counts (proof that continuous monitoring ran, including passes). 6. Triggered: on app start, by "Run checks now", by demo "Move date forward", and by a Vercel cron in deployment.
**Time travel (demo):** `POST /api/demo/advance-time {days}` moves the `FakeClock` and runs checks, so certificates visibly expire, deadlines approach and vendor documents lapse during the defense.

### 7.4 AI layer (all functions: untrusted output, validator, fallback, fixtures)
Common rules: temperature 0; prompt contains only supplied facts and clause text, each with ids; output is zod-validated JSON; one retry on validation failure, then deterministic fallback; every paragraph carries `origin`; `AI_MODE=fixtures` loads pre-generated, pre-validated output from `data/fixtures/ai/`; `AI_MODE=off` uses fallbacks only; `AI_MODE=live` calls Kimi (Moonshot) with `KIMI_API_KEY`/`KIMI_MODEL`. UI shows "AI-assisted" when AI produced it and "Written from template" otherwise.

**A. Explain (per alert).** Plain-language "why this was flagged and why it matters", citing clause ids. Fallback: template built from `summarize()` and the rule's description.

**B. Draft (per alert).** Dossier by `kind` (outlines: sar: Subject · Chronology · Deviation from baseline · Evidence attached · Recommendation; soc2_deficiency: Control · Impact · Compensating controls · Remediation plan; hipaa_4factor: Nature of information · Who accessed · Mitigation · Likelihood of compromise; te_disallowance: Expense and category · Policy breach · Manager justification needed; secure_sdlc_finding: Found · Exposure · Fix · Prevention; exception_memo: Finding · Requirement · Impact · Corrective action · Owner and due date).

**C. Extract obligations (per policy document).** Input: the document text. Output: list of proposed obligations, each with `quote` copied from the document. Validator: `quote` must be a substring of the document after whitespace normalisation; `kind` valid; no obligation without a quote. Result status is `proposed`. A person confirms, edits or rejects each (ledger `OBLIGATION_CONFIRMED`). AI may suggest a matching `ruleId`, shown as a suggestion; the person chooses. Fallback: heading and sentence-pattern heuristics ("must", "shall", "at least every", "no later than").

**D. Coverage (deterministic).** `coverage/compute.ts`: obligation `confirmed` with `ruleIds` and a recent passing check → `covered`; has rules but evidence missing → `partial`; no rule → `gap`. Headline: "31 of 38 obligations are checked automatically. 7 have no check." This is computed, not AI.

**E. Gap suggestions (advisory).** For each `gap`, AI may propose "what check or evidence would satisfy this", quoting the obligation. Validator: quote check as in C, cannot reference rule ids that do not exist. Shown under "Suggestions", never counted as findings.

**F. Suggested order (advisory risk ranking).** Input: open alerts with their score, reasons, SLA remaining and subject facts. Output: ranked list with a one-sentence reason and `citedFacts`. Validator: every alert id exists exactly once; `citedFacts` are present in the supplied facts; no new numbers. Shown as "Suggested order" next to the score order, with a marker where they differ and a "Why". The officer can follow it or not. **Scores, severities and SLAs are never modified by it.** Fallback: order by score then SLA.

**Forbidden in any AI text (validator rejects):** legal conclusions without a citation, "guilty", "committed a crime", "compliant with", "certified", "filed with", numbers or names not present in the supplied facts.

### 7.5 Evidence locker
`core/evidence`: `record(kind, title, content, subjectRef)` canonicalises content, hashes it, stores it, appends `EVIDENCE_RECORDED` to the ledger, returns the item with its block index. Alerts reference snapshot ids. Items are immutable. Evidence page shows title, source, collected time, "Verified" tick (hash matches ledger entry), and "Show technical details" for the hash. Documents uploaded by officers (e.g. a renewed certificate PDF) enter the same way and can auto-resolve alerts when attached to the matching record.

### 7.6 Ledger (`core/ledger`)
- Canonical JSON: sorted keys, no whitespace, UTF-8, ISO-8601 UTC ms timestamps. One function, used everywhere.
- `payloadHash = sha256hex(canonical(payload))`
- `currentHash = sha256hex(canonical({ blockIndex, timestamp, eventType, actor, alertId, payloadHash, previousHash }))`
- Genesis: index 0, `previousHash = '0'.repeat(64)`.
- Append-only in code and DB (§8). Appends via one function with an advisory lock; `unique(block_index)`.
- **Verifier** recomputes both hashes, checks linkage, contiguous indices, non-decreasing timestamps, and that every evidence item's stored hash matches its ledger payload. Returns `{ ok, checked }` or `{ ok:false, firstBrokenIndex, reason, untrustedAfter }`.
- **Tamper simulation** works on an in-memory copy (mutate payload amount, timestamp, actor; delete or reorder a block), then verify, then Restore. It never touches the stored ledger. `scripts/tamper-db.ts` does a real service-role edit so the verifier can be run live in Q&A.

### 7.7 Audit pack (the "audit-ready report")
`POST /api/reports/audit-pack {from, to, domains?}` produces a PDF and a JSON bundle (plus CSV of the evidence index) containing:
1. Scope and period, who generated it, when (clock time), **method statement** (what is automated, where AI is used, what AI cannot do).
2. Check summary: rules run, subjects checked, passes, failures, per rule.
3. Findings: each alert with plain sentence, rule and parameters, policy references, risk reasons, status, decision, reason code, decider, timestamps.
4. Policy coverage section (covered, partial, gaps, with obligation quotes).
5. Evidence index: id, title, source, collected time, hash, ledger block.
6. Ledger verification result at generation time and the **head hash**, plus instructions for an auditor to re-verify with the open verifier.
Ledger records `AUDIT_PACK_EXPORTED` with the pack hash. Other exports: SAR-style draft (PDF and draft XML), exception memos.

### 7.8 Demo scenarios (each has a negative-control twin that must produce no alert)
Tier 1 set: `structured-deposits` (AML-001: USD 9,800.00 then USD 9,400.00, 34h apart), `payment-without-approver` (FIN-001), `sod-breach` (IAM-001), `restricted-record-access` (HIPAA-001), `leaked-secret` (DEV-001, documented fake AWS example key), `expired-certification` (CERT-001: advance time past a certificate expiry, then attach renewed certificate to see auto-resolve), `missed-deadline` (DEAD-001: quarterly filing due, advance time), `vendor-document-lapsed` (VEND-001). Tier 2 extras follow the rule table.

### 7.9 Responses (safe by design; Tier 1 shows suggestions only, Tier 3 adds AI planning)
Catalog: `suspend-token-on-mfa-disabled`, `block-pipeline-on-secret`, `request-renewal-from-owner` (sends a draft message, no real sending). Mode per response: `off | suggest | automatic`, default `suggest`. Executor is dry-run unless `RESPONSES_LIVE=true`; shows the would-be request under "Show technical details". Executions and reversals are ledger blocks. Automatic responses reverse themselves when the triggering condition clears (state rules).
Tier 3 upgrade: AI proposes a plan from an **allowlist of actions**; validator rejects any action not in the allowlist; a person approves; the deterministic executor acts; ledger records proposal, approval, execution.

### 7.10 Tier 2: CI/CD gate
`ci/action.yml` (GitHub Action) and `ci/ciq-gate` CLI call `POST /api/ci/gate` with the diff's added lines and dependency manifest (package.json / requirements.txt / go.mod), authenticated by `CI_GATE_TOKEN`. Server runs DEV-001 and DEV-002, returns `pass | block` with reasons, records a `ci_log` evidence item and a ledger block, and raises an alert on block. A later passing run on the same repo and branch auto-resolves the alert ("fix logged"). Demo repo with one failing PR is included in `docs/`.

### 7.11 Tier 2: questionnaire responder
Upload messy `.xlsx` (multi-tab, odd headers). Steps: detect likely question and answer columns per sheet with fuzzy header matching; **show the detected mapping for confirmation**; for each question, retrieve candidates from confirmed obligations, coverage, and evidence (local embeddings); answer **only** from matched facts; each answer carries: obligation id, policy quote, evidence item ids with hashes and last-verified time, and a confidence; if nothing matches above threshold write "No evidence found. Needs manual answer." Validator as in §7.4 (ids exist, no new facts). Output: filled `.xlsx` with an extra "Evidence" column and an index sheet; ledger block per export. Never guesses.

### 7.12 Tier 3: Go agent
`agent/` single binary `ciq-agent`: reads a YAML list of targets (local config files, listening ports), canonicalises, SHA-256, signs with Ed25519, POSTs to `/api/agent/ingest`. Server holds registered public keys, verifies the signature and batch hash, stores an `agent_batch` evidence item. A tampered batch is rejected, the source shows "Delayed", and an alert is raised. Keep it under ~400 lines and cross-compile for Windows and Linux. `agent-mock/` provides the same flow in TypeScript if the binary is not ready.

### 7.13 Tier 3: AI-system governance
Registry fixtures: models (version, stage, evaluation record, drift metric), datasets (PII scan result, consent, provenance). Rules AI-001…004 (see table). Policy summaries for EU AI Act, NIST AI RMF, ISO/IEC 42001 are **summaries only**. UI: "Training readiness" page (DESIGN.md §13). No live Hugging Face/SageMaker connectors.

---

## 8. Database (Supabase migrations)

Tables: `profiles`, `events`, `people`, `certifications`, `requirements`, `vendors`, `vendor_documents`, `accounts`, `policy_documents`, `policy_clauses`, `obligations`, `alerts`, `explanations`, `drafts`, `evidence_items`, `check_runs`, `priority_suggestions`, `audit_blocks`, `response_settings`, `source_connections`.
- `audit_blocks` and `evidence_items`: `BEFORE UPDATE OR DELETE` trigger raises; `REVOKE UPDATE, DELETE` from `anon` and `authenticated`. Append via RPC with `pg_advisory_xact_lock`.
- RLS on every table. Roles: `officer` (decide, edit registers, confirm obligations), `auditor` (read all, verify, export, cannot decide), `admin` (response modes, rules, reset, advance time). Enforced in API routes and tested.
- Seed script creates three demo users, one per role.

---

## 9. Offline and failure behaviour
`DATA_MODE=memory`, `AI_MODE=fixtures`: full app, no network. `live` AI (Kimi) falls back automatically to templates on any error or validation failure. Embeddings precomputed. "Reset demo" (admin) restores seeded state and a verified ledger. Every page has designed empty, loading (skeleton) and error states.

---

## 10. UI (summary; DESIGN.md is binding)
Plain language, Mist blue default 60/30/10 theme, four alternates (DESIGN.md §3), sentence case, 16px base, 52px rows, mono only for hashes and IDs. Six signature components plus the additions in DESIGN.md §15. Screens: Overview, Alerts (with Suggested order), Case workbench, Audit record, Policy coverage, Obligations, People and certifications, Vendors, Deadlines, Evidence, Rules, Policies, Reports, Sources, Responses, Settings, Demo panel, Landing; Tier 2: Questionnaires, CI gate; Tier 3: Training readiness. Seed currency USD; people and entities per DESIGN.md §9 plus the register seed in `data/seed/`.

---

## 11. Testing and quality gates
**Unit:**
- Every rule: ≥3 positive, ≥4 boundary/negative, determinism, no input mutation.
- State rules with `asOf` boundaries: expires today (valid), expired yesterday (fail), warning window edges, leap-day dates, timezone-safe date handling (compare dates in UTC).
- Auto-resolve: renewing a certification closes the alert, writes `ALERT_AUTO_RESOLVED` and evidence; re-expiry opens a new alert (not the old one).
- Evidence: snapshot is immutable; later register edit does not change the stored hash; verifier detects a mutated evidence row.
- Ledger: valid chain verifies; tamper payload, timestamp, actor, previousHash, currentHash; delete, reorder, forged insert; genesis mismatch; first broken index exact.
- Canonical JSON: key order, unicode, numbers, nesting.
- Retrieval and mapping: every rule has a mapped clause; every mapped id exists; threshold behaves.
- AI validators: reject fabricated chunk id, fabricated number, missing quote (obligation extraction), unknown alert id (suggested order), allowlist violation (Tier 3), forbidden phrases; accept all fallbacks.
- Coverage computation across covered, partial, gap cases.
- Pipeline: idempotency, dedupe, each scenario yields exactly expected alerts, twin yields none.
- Audit pack: every evidence hash in the pack re-verifies; head hash matches ledger; pack hash recorded.
- API: auditor gets 403 on decisions; zod rejects bad payloads.
**E2E (Playwright):**
1. Each Tier 1 scenario → alert → case → explanation and policy notes → draft → File report → saved row → audit record entries → tamper check passes.
2. Simulate tampering → fails at exact entry → Restore → passes.
3. Time travel: expire a certificate → alert appears → attach renewal → auto-closes.
4. Upload demo policy → proposed obligations → confirm some → coverage updates and shows gaps.
5. Suggested order appears and flags differences without changing scores.
6. Generate audit pack; open PDF; head hash matches the Audit record page.
7. Role switch hides decision actions for auditor. Keyboard-only run of Alerts. 390px viewport has no horizontal scroll.
**Non-functional:** typecheck, ESLint clean; Lighthouse accessibility ≥ 95 on landing and case page; no console errors; evaluate 10,000 seeded events and 2,000 register rows in < 2 s (record in `PROGRESS.md`).

---

## 12. Milestones

| # | Milestone | Deliverables | Acceptance |
|---|---|---|---|
| M0 | Scaffold + design kit | App, folders, `tokens.css` (colour, type, illustration, motion), `/styleguide`, **illustration kit and scene library** (`/styleguide/illustrations`), **motion lab** (`/styleguide/motion`), scripts, `.env.example`, `PROGRESS.md` | Styleguide, illustrations and motion frames match DESIGN.md Part II. **GATES: owner approves styleguide, then illustrations, then motion.** |
| M1 | Types, clock, ledger core | `core/types`, `Clock`/`FakeClock`, canonical, hash, chain, verify, tamper-sim, labels | Ledger tests pass |
| M2 | Rules engine | Event + state evaluators, 8 Tier 1 rules, registers seed, risk, summaries | Rule and `asOf` tests pass |
| M3 | Policy corpus | Demo policy documents, `clauses.json`, `mapping.json`, embeddings script, retrieval | Mapping tests pass; coverage gaps present by design. **GATE: owner reviews corpus and obligations.** |
| M4 | Evidence locker + scheduler | `core/evidence`, `run-checks`, auto-resolve, `CheckRun`, time travel | Evidence, auto-resolve and scheduler tests pass |
| M5 | AI layer 1 | Explain, Draft, templates, validators, fixtures for Tier 1 scenarios | Validator tests pass; fixtures validated |
| M6 | AI layer 2 | Extract obligations, coverage compute, gap suggestions, suggested order, validators, fixtures | Quote and id validators pass; coverage tests pass |
| M7 | Repository layer | `Repo` interface, memory + Supabase repos, migrations, RLS, seed | Same repo test suite passes on both; DB rejects UPDATE/DELETE on `audit_blocks` and `evidence_items` |
| M8 | Pipeline + API | `process-event`, `run-checks` API, `decide`, all Tier 1 routes, scenarios and twins, audit-pack generator | Pipeline, API and audit-pack tests pass |
| M9 | Shell + Alerts + Case workbench | App shell, alerts table with Suggested order, workbench tabs, signature components 1–5 | E2E 1 passes for one scenario; DESIGN §11 passes. **GATE: owner reviews screens.** |
| M10 | Audit record + demo panel | Audit page, tamper check, demo panel with scenarios and time travel | E2E 1–3 pass for all Tier 1 scenarios |
| M11 | Remaining Tier 1 screens | Overview, Policy coverage, Obligations (upload, confirm), Registers, Deadlines, Evidence, Rules (test harness), Policies, Reports (audit pack), Sources, Responses (suggest mode), Settings, role switcher | E2E 4–7 pass |
| M12 | Landing page | DESIGN.md §19 (illustrated, choreographed scroll story, interactive tamper hero) | Lighthouse a11y ≥ 95, LCP < 2.5s, CLS 0; reduced-motion run passes; copy passes §1.4; Awwwards-style self-review ≥ 8 on all four criteria. **GATE: owner reviews landing.** |
| M13 | Hardening + defense kit | a11y, performance numbers, error states, deploy, README, architecture page, `docs/defense.md`, offline rehearsal, **usability study** (5 participants, 5 tasks, SUS; DESIGN.md §18) | All suites green; works with Wi-Fi off. **GATE: owner sign-off.** |
| T1 | CI/CD gate (Tier 2) | §7.10 | Demo PR blocked then fixed; evidence and ledger entries present |
| T2 | Questionnaire responder (Tier 2) | §7.11 | Three messy sample files parse; every answer has evidence ids or "No evidence found" |
| T3 | Go agent (Tier 3) | §7.12 | Valid batch accepted; tampered batch rejected |
| T4 | Responses upgrade + AI governance (Tier 3) | §7.9 upgrade, §7.13 | Allowlist validator tests pass |

Tier 2/3 milestones are scheduled after M11 and before M12/M13 only if the owner approves; M12 and M13 are never skipped.

---

## 13. Out of scope
Real integrations with banks, identity providers, HR systems, EHRs, FinCEN e-filing; real sanctions list ingestion; custom-trained ML models; multi-tenancy and billing; mobile app; email/Slack sending; internationalisation; real WORM storage and legal retention; any certification claim; live Hugging Face/SageMaker connectors.

---

## 14. Defense kit (`docs/defense.md`)

### 14.1 Ten-minute demo path
1. (1 min) Landing: "Rules decide. AI explains. People sign off. Everything is provable."
2. (2 min) Policy coverage: upload a demo policy → proposed obligations with exact quotes → confirm → "31 of 38 checked automatically, 7 have no check" (gap G1).
3. (2 min) Time travel: move date forward 30 days → a certification expires and a deadline is missed → alerts appear → open one: plain sentence, activity visual, how it was triggered, policy note, AI-assisted explanation → attach renewal → alert closes automatically.
4. (2 min) Run structured deposits: case, draft, File report, saved row. Audit record: tamper check passes, **simulate tampering**, caught at the exact entry, Restore.
5. (1 min) Suggested order vs score order: show a difference and say AI never changes scores.
6. (1 min) Negative-control twin produces no alert.
7. (1 min) Generate audit pack; show evidence hashes and head hash matching the Audit record page. Close on honest limits (§1.4, §13).
Tier 2 if built: CI gate block on a PR; questionnaire answered with evidence hashes.

### 14.2 Anticipated questions (write short answers)
- Why not let the AI decide? Reproducibility and explainable basis; AI output is validated and cannot change verdicts or scores.
- AI "ranks risk"? Score is deterministic and authoritative; AI order is advisory, labelled, and its differences are shown.
- How do you know the AI did not invent a citation or a fact? Validators check ids, quotes and numbers; fallback templates exist; tests cover rejection.
- How is this different from Vanta/Drata/Unit21? Use §1.2, stay narrow and demonstrable; do not overclaim.
- Is it SEC 17a-4 compliant? No: tamper evidence only; retention and WORM out of scope.
- What if a DB admin edits a row? DB blocks UPDATE/DELETE; if bypassed, the verifier catches it (run `tamper-db.ts`).
- False positives? Parameters visible, risk reasons explain scores, dismissals need reason codes and are recorded, negative-control tests.
- Scalability? Windowed evaluation per subject; report the 10,000-event benchmark; streaming/partitioning as future work.

### 14.3 Report artefacts to collect during the build
Architecture diagram (§2), rule catalog (§6.1), ledger formula and verifier algorithm (§7.6), AI boundary table (§7.4), test summary and benchmark, screenshots at 1440px, gap table (§1.2), limitations and future work (§13).

---

## 15. Definition of done
- [ ] Tier 1 milestones M0–M13 accepted; `PROGRESS.md` complete.
- [ ] typecheck, lint, unit and e2e all green.
- [ ] Full demo works offline (`DATA_MODE=memory`, `AI_MODE=fixtures`).
- [ ] Every screen passes DESIGN.md §11; all copy plain-language.
- [ ] No compliance or certification claims (grep: "compliant with", "17a-4", "FINRA", "filed with", "certified").
- [ ] Deployed URL works with three demo roles; README covers setup, env vars, reset, time travel, tamper script.

---

## 16. Open decisions

| # | Decision | Status |
|---|---|---|
| 1 | **Time and team:** weeks until the defense; solo or group. Sets how much Tier 2/3 is realistic. | **Open** |
| 2 | **Tier 2 order:** CI gate first, questionnaire first, or only one. | **Open** |
| 3 | **Tier 3:** include any? | **Resolved (phased):** all tiers in scope; Tier 3 runs as Phase 3 after Tier 2, timing depends on decision 1. |
| 4 | **AI vendor:** | **Resolved:** Kimi (Moonshot AI), pay-as-you-go, behind `AI_MODE`; fixtures keep the demo independent of it. |
| 5 | **Report language:** keep the 17a-4 wording in the written report? (recommended: no) | **Open** |
| 6 | **Real repo for the CI gate demo:** which GitHub repo to use. | **Open** (needed before T1) |
| 7 | **Theme:** 60/30/10 butter/marine/red. | **Resolved:** 60/30/10 with five palettes; Mist blue chosen as default by owner; applied in DESIGN.md §3. |
