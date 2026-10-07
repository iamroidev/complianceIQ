import type {
  Alert,
  AuditBlock,
  CheckRun,
  ComplianceEvent,
  Draft,
  EvidenceItem,
  Explanation,
  Paragraph,
  PolicyRef,
  PrioritySuggestion,
  RuleResult,
} from "../../src/core/types";

export const T0 = "2026-03-01T09:00:00.000Z";
export const T0_SLA = "2026-03-04T09:00:00.000Z";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

export function paragraph(id: string, overrides: Partial<Paragraph> = {}): Paragraph {
  return {
    id,
    text: "Text grounded in a cited rule.",
    citations: ["POL-001.md"],
    evidenceRefs: [{ type: "record", id: "rec_1" }],
    origin: "ai",
    ...overrides,
  };
}

function ruleResult(): RuleResult {
  return {
    ruleId: "CERT-001",
    ruleVersion: "1.0.0",
    verdict: "fail",
    subject: { id: "p_nana", name: "Nana Adjeiwaa" },
    triggeringRefs: [{ type: "record", id: "certs" }],
    observed: { certifications: 0 },
    parameters: { required: 1 },
  };
}

export function policyRef(chunkId = "chunk_1"): PolicyRef {
  return { chunkId, reason: "mapped", confidence: 0.9 };
}

export function makeAlert(id: string, overrides: Partial<Alert> = {}): Alert {
  return {
    id,
    ruleId: "CERT-001",
    ruleVersion: "1.0.0",
    domain: "people",
    severity: "medium",
    riskScore: 25,
    riskReasons: ["Missing required certificate"],
    summarySentence: "Nana Adjeiwaa has no Security awareness certificate on file.",
    subject: { id: "p_nana", name: "Nana Adjeiwaa" },
    evidenceRefs: [{ type: "record", id: "certs" }],
    snapshotEvidenceIds: ["ev_snapshot_1"],
    result: ruleResult(),
    policyRefs: [policyRef()],
    status: "open",
    createdAt: T0,
    slaDueAt: T0_SLA,
    ...overrides,
  };
}

export function makeEvidence(id: string, overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id,
    kind: "record_snapshot",
    title: "Certifications snapshot",
    source: "people.certifications",
    collectedAt: T0,
    contentHash: HASH_A,
    content: { rows: [{ personId: "p_nana", certType: "security_awareness" }] },
    ledgerBlockIndex: 0,
    ...overrides,
  };
}

export function makeCheckRun(id: string, overrides: Partial<CheckRun> = {}): CheckRun {
  return {
    id,
    asOf: T0,
    rulesRun: 8,
    subjectsChecked: 12,
    passed: 7,
    failed: 1,
    opened: 1,
    resolved: 0,
    ledgerBlockIndex: 0,
    ...overrides,
  };
}

export function makeBlock(blockIndex: number, overrides: Partial<AuditBlock> = {}): AuditBlock {
  return {
    blockIndex,
    timestamp: T0,
    eventType: "CHECK_RUN",
    actor: "system:run-checks",
    payload: { runId: `run_${blockIndex}` },
    payloadHash: HASH_A,
    previousHash: blockIndex === 0 ? "0".repeat(64) : HASH_B,
    currentHash: HASH_B,
    ...overrides,
  };
}

export function makeExplanation(
  id: string,
  alertId: string,
  overrides: Partial<Explanation> = {},
): Explanation {
  return {
    id,
    alertId,
    paragraphs: [paragraph(`${id}_p1`)],
    generatedBy: "fixture",
    ...overrides,
  };
}

export function makeDraft(id: string, alertId: string, overrides: Partial<Draft> = {}): Draft {
  return {
    id,
    alertId,
    kind: "sar",
    paragraphs: [paragraph(`${id}_p1`)],
    generatedBy: "fixture",
    createdAt: T0,
    ...overrides,
  };
}

export function makePriority(id: string, alertId: string): PrioritySuggestion {
  return {
    id,
    generatedAt: T0,
    order: [{ alertId, rank: 1, reason: "Score 25 (medium)", citedFacts: ["risk score 25"] }],
    generatedBy: "score-order",
  };
}

export function makeEvent(id: string, overrides: Partial<ComplianceEvent> = {}): ComplianceEvent {
  return {
    id,
    domain: "identity",
    actor: { id: "u_system", name: "Scheduler", role: "service" },
    action: "check.run",
    resource: { type: "check_run", id: "run_1", label: "Nightly run" },
    context: { trigger: "schedule" },
    timestamp: T0,
    source: "scheduler",
    ...overrides,
  };
}
