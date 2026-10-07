# ComplianceIQ

> **Compliance decisions you can prove.**  
> Continuous automated compliance monitoring, cryptographic audit records, and guarded AI assistance for enterprise policies and regulations.

---

## 1. Overview

ComplianceIQ automatically evaluates whether an organization adheres to its internal operating policies and external regulatory obligations. 

Unlike conventional GRC dashboards that rely on manual questionnaires and static screenshots, ComplianceIQ executes continuous deterministic rule checks across streaming events and state registers, snapshots evidence immutably at detection time, and records every decision in a SHA-256 hash-chained audit ledger.

### Key Capabilities
- 🔍 **Dual Rule Architecture:** Continuous event stream monitoring (`AML-001`, `FIN-001`, `IAM-001`, `HIPAA-001`, `DEV-001`) alongside scheduled state registers (`CERT-001`, `DEAD-001`, `VEND-001`).
- 🔗 **Cryptographic Audit Ledger:** Tamper-evident hash chain with client-side zero-dependency SHA-256 verification and simulated tamper detection.
- 🔄 **Bi-directional Auto-Resolution:** Scheduled checks open alerts upon failure and automatically close them when verified renewals or remedial evidence are attached.
- 🛡️ **Guarded AI Layer:** Large Language Models operate strictly in an advisory capacity (explain, draft, extract, suggest) and are subjected to mechanical fact-matching and citation validators.
- 📄 **Policy-to-Checks Coverage Engine:** Extracts actionable obligations with exact quotes from raw policy markdown and exposes automated vs. manual coverage gaps.

---

## 2. Honest Claims Boundary

In accordance with specification guidelines:
- **Tamper-Evident Record Keeping:** Uses deterministic SHA-256 hash-chaining over canonical JSON. Designed to support tamper-evident record keeping; does not claim SEC 17a-4 / WORM physical hardware storage.
- **SAR-Style Drafts:** Suspicious activity reports are exported as drafts in internal format; does not interface directly with FinCEN BSA E-Filing.
- **Demo Policies & Excerpts:** Regulations and policy documents are demo summaries or permitted public excerpts.
- **Readiness Verification:** Provides continuous monitoring and gap verification, not legal or statutory certification.

---

## 3. Quick Start & Offline Demo

ComplianceIQ is fully functional offline with zero external network dependencies.

### Prerequisites
- Node.js 20+
- pnpm 9+ or 12+

### Installation & Execution
```bash
# 1. Install dependencies
pnpm install

# 2. Start the development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Offline Demo Mode
In `.env.local` (or default environment):
```env
DATA_MODE=memory
AI_MODE=fixtures
```
This enables the in-memory repository and pre-validated deterministic AI fixtures with zero API key requirements.

---

## 4. Verification & Testing Suite

ComplianceIQ includes a comprehensive test and quality assurance battery:

```bash
# Typecheck
pnpm exec tsc --noEmit

# Linting
pnpm exec eslint src/ --max-warnings 0

# Unit Test Battery (427 tests across 44 test files)
pnpm exec vitest run

# End-to-End Playwright Suite (27 browser tests)
pnpm exec playwright test

# Motion Choreography Verification (45 programmatic checks)
node scripts/motion-verify.mjs

# Non-Functional Performance Benchmark (10,000 events + 2,000 registers)
npx --yes tsx scripts/benchmark.ts
```

---

## 5. Project Structure

```
complianceIQ/
├── docs/                      # Defense guides, architecture specs, usability study
│   ├── architecture.md
│   ├── defense.md
│   └── usability-study.md
├── scripts/                   # Verification, benchmark, and motion testing scripts
│   ├── benchmark.ts
│   └── motion-verify.mjs
├── src/
│   ├── app/                   # Next.js App Router (Landing, Workspace, API routes)
│   ├── components/            # UI components, illustration kit, signature components
│   ├── core/                  # Pure deterministic business logic
│   │   ├── ai/                # Guarded AI prompts, validators, and fallbacks
│   │   ├── clock/             # Time injection and time-travel clock
│   │   ├── coverage/          # Coverage gap calculation engine
│   │   ├── engine/            # Event & state rule evaluators (TIER1_RULES)
│   │   ├── evidence/          # Evidence snapshotting and hashing
│   │   ├── ledger/            # SHA-256 canonical hash-chain implementation
│   │   ├── pipeline/          # Ingestion, decision handling, and scenarios
│   │   ├── rag/               # Policy corpus indexing and retrieval
│   │   ├── repo/              # Storage ports (Memory & Supabase)
│   │   └── reports/           # Cryptographic audit-pack and SAR generators
│   ├── data/                  # Policy documents, clauses, and scenario seeds
│   └── styles/                # CSS design tokens (tokens.css, app.css, landing.css)
└── tests/
    ├── e2e/                   # Playwright end-to-end integration specs
    └── unit/                  # Vitest unit test suites
```

---

## 6. License
Academic project, University of Mines and Technology. All rights reserved.
