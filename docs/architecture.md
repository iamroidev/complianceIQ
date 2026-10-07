# ComplianceIQ — System Architecture

This document details the system design, data contracts, state guarantees, and cryptographic proof mechanisms implemented in ComplianceIQ.

---

## 1. System Overview & Honest Claims (§1.4)

ComplianceIQ continuously monitors enterprise state and event streams against internal policies and regulatory requirements. It records all decisions and evidence into a cryptographic, hash-chained ledger.

### ⚠️ Honest Claims Boundary (Non-Negotiable)
- **Tamper-Evident, Not SEC 17a-4 / WORM Storage:** ComplianceIQ implements SHA-256 hash chaining over canonical JSON representations. This provides deterministic tamper detection. It is designed to support tamper-evident record keeping. Real immutable WORM storage appliances, physical optical media, and legal retention locks are out of scope.
- **SAR-Style Drafts, Not Official FinCEN Filings:** Exported suspicious activity reports are marked as "SAR-style draft — not a filed report". The system does not interface with FinCEN's BSA E-Filing System.
- **Demo Connections & Sample Corpus:** All regulatory clauses (e.g. 31 CFR § 1020.320, 45 CFR § 164.502) and internal policies are clearly marked as demo summaries or verbatim public excerpts where permitted.
- **Readiness & Verifications, Not Certifications:** ComplianceIQ provides continuous check verification and gap discovery; it never claims legal certification or automatic regulatory compliance.

---

## 2. Architectural Data Flow

```
 Event sources (scenarios, seed streams, local agent)          Registers (people, certifications, requirements,
            │ POST /api/events                                  vendors, accounts, obligations)
            ▼                                                              │ scheduled
   ┌───────────────────┐                                          ┌───────────────────┐
   │ Ingest + validate │                                          │ Scheduler (Clock) │ run-checks(asOf)
   └─────────┬─────────┘                                          └─────────┬─────────┘
             └──────────────────────────┬─────────────────────────────────┘
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

---

## 3. Core Subsystems

### 3.1 Deterministic Rules Engine (`src/core/engine/`)
The engine is 100% deterministic and pure:
- **Event Rules (`TIER1_EVENT_RULES`):** Evaluates event streams (e.g., `AML-001` structured deposits, `FIN-001` payment approval limits, `IAM-001` separation of duties, `HIPAA-001` restricted record access, `DEV-001` secrets committed to code).
- **State Rules (`TIER1_STATE_RULES`):** Evaluates registers as of a specific point in time (`CERT-001` expired certifications, `DEAD-001` regulatory deadlines, `VEND-001` vendor compliance documents).
- **Injected Clock:** No bare `Date.now()` is used. All timestamps derive from an injected `Clock` (`SystemClock` in production, `FakeClock` during testing and time-travel simulation).

### 3.2 Cryptographic Ledger (`src/core/ledger/`)
- **Canonical Serialization:** Every payload is serialized using `canonical(obj)` (recursive key sorting, strict JSON primitives, zero extra whitespace).
- **Dual Hash Structure:**
  - `currentHash = SHA256(canonical({ index, timestamp, eventType, actor, alertId?, ruleId?, payloadHash, evidenceHash?, previousHash }))`
  - `payloadHash = SHA256(canonical(payload))`
  - `evidenceHash = SHA256(canonical(evidenceContent))`
- **Verification Algorithm (`verifyChain`):** Recomputes hashes across the entire chain from genesis (`index: 0`, `previousHash: "0000000000000000000000000000000000000000000000000000000000000000"`), verifies monotonic non-decreasing timestamps, and checks evidence integrity. Detects any alteration at the exact broken index.

### 3.3 Evidence Locker (`src/core/evidence/`)
- When an alert is raised, facts from the subject's register and context are snapshotted and deep-frozen (`deepFreeze`).
- The SHA-256 hash of the frozen evidence is appended to the ledger as an `EVIDENCE_RECORDED` block.
- Subsequent changes to register rows never alter historical evidence snapshots.

### 3.4 AI Guardrail Layer (`src/core/ai/`)
- **Advisory Role Only:** AI never decides a verdict, never modifies risk scores, never alters SLAs, and never writes ledger blocks directly.
- **Strict Mechanical Validation:** Every AI generation must pass through programmatic validators:
  - Facts check: every number and proper noun in AI prose must exist in the fact block.
  - Citations check: citations must reference valid chunk IDs from the corpus.
  - Forbidden claims check: rejects speculative statements or unverified legal conclusions.
  - Outlines check: headings must match official dossier outlines.
- **Deterministic Fallbacks:** If the live AI model (Kimi / OpenAI-compatible) fails validation or times out, deterministic template fallbacks are used immediately.

### 3.5 Storage Port (`src/core/repo/`)
All storage implements the `Repo` port interface:
- **`InMemoryRepo`:** Used for offline testing, local demo execution, and fast unit test runs.
- **`SupabaseRepo`:** Used for production deployment with PostgreSQL RLS and append-only database triggers (`reject_mutation()` on `audit_blocks` and `evidence_items`).

---

## 4. Security & Role Matrix (MASTER §8)

| Action | Officer | Auditor | Admin |
|---|:---:|:---:|:---:|
| View Alerts, Evidence, Policies | ✅ | ✅ | ✅ |
| Verify Audit Chain & Export Audit Pack | ✅ | ✅ | ✅ |
| File / Dismiss / Escalate Decisions | ✅ | ❌ (403 Forbidden) | ✅ |
| Edit Registers / Upload Obligations | ✅ | ❌ (403 Forbidden) | ✅ |
| Advance Demo Time / Reset Baseline | ❌ | ❌ | ✅ |
| Change Automated Response Settings | ❌ | ❌ | ✅ |
