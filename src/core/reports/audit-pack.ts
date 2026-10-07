import type { Clock } from "../clock";
import { canonical, headHash, sha256hex, verifyChain, type Ledger } from "../ledger";
import { computeCoverage, coverageHeadline, derivePassingChecks } from "../coverage/compute";
import type { Alert, CheckRun, EvidenceItem, Obligation } from "../types";
import { buildTextPdf, type PdfSection } from "./pdf";

export interface AuditPackInput {
  from: string;
  to: string;
  domains?: string[];
  generatedBy: string;
}

export interface AuditPackDeps {
  ledger: Ledger;
  clock: Clock;
  alerts: readonly Alert[];
  checkRuns: readonly CheckRun[];
  evidence: readonly EvidenceItem[];
  obligations: readonly Obligation[];
}

export interface PackDecision {
  eventType: string;
  decider: string;
  reason: string | null;
  at: string;
  blockIndex: number;
}

export interface PackFinding {
  alertId: string;
  ruleId: string;
  domain: string;
  severity: string;
  riskScore: number;
  status: string;
  subjectId: string;
  subjectName: string;
  summarySentence: string;
  riskReasons: string[];
  policyChunkIds: string[];
  createdAt: string;
  slaDueAt: string;
  decision: PackDecision | null;
}

export interface AuditPackBundle {
  scope: {
    from: string;
    to: string;
    domains: string[];
    generatedBy: string;
    generatedAt: string;
    methodStatement: string;
  };
  checkSummary: {
    runs: number;
    latestRun: {
      id: string;
      asOf: string;
      rulesRun: number;
      subjectsChecked: number;
      passed: number;
      failed: number;
    } | null;
    findingsPerRule: { ruleId: string; findings: number }[];
  };
  findings: PackFinding[];
  coverage: { headline: string; items: ReturnType<typeof computeCoverage> };
  evidenceIndex: {
    id: string;
    kind: string;
    title: string;
    source: string;
    collectedAt: string;
    contentHash: string;
    ledgerBlockIndex: number;
  }[];
  verification: {
    chainOk: boolean;
    checked: number;
    firstBrokenIndex: number | null;
    failureReason: string | null;
    evidenceHashesOk: boolean;
    contentHashesRehashed: number;
    contentHashesOk: boolean;
    headHash: string | null;
  };
}

export interface BuiltAuditPack {
  bundle: AuditPackBundle;
  csv: string;
  pdfBase64: string;
  packHash: string;
  ledgerBlockIndex: number;
}

const DECISION_EVENTS = new Set(["REPORT_FILED", "ALERT_DISMISSED", "ALERT_ESCALATED"]);

/** §7.7 item 1 — what is automated, where AI is used, what AI cannot do. */
export const METHOD_STATEMENT =
  "Automated: rules evaluate deterministically from registers and stored evidence on demand, " +
  "on demo time travel, and at application start; every hash and ledger link is recomputed from " +
  "stored bytes, never trusted as given. AI-assisted: explanations, drafts, obligation extracts, " +
  "gap suggestions and the suggested order are produced by a configured model, mirrored by " +
  "fixtures or templates otherwise, and each output is validated against its alert's own facts " +
  "with a template fallback on any failure. AI cannot: file, dismiss or escalate a finding; " +
  "append, reorder or rewrite a ledger block; invent numbers, names or citations; or certify a " +
  "legal conclusion without a citation.";

function decisionFor(alertId: string, blocks: readonly { blockIndex: number; timestamp: string; eventType: string; actor: string; alertId?: string; payload: Record<string, unknown> }[]): PackDecision | null {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (!DECISION_EVENTS.has(block.eventType)) continue;
    const payloadAlertId = (block.payload["alertId"] as string | undefined) ?? block.alertId;
    if (payloadAlertId !== alertId) continue;
    const reason = block.payload["reason"];
    return {
      eventType: block.eventType,
      decider: block.actor,
      reason: typeof reason === "string" ? reason : null,
      at: block.timestamp,
      blockIndex: block.blockIndex,
    };
  }
  return null;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * §7.7 audit pack: deterministic bundle (scope+method, check summary,
 * findings, coverage, evidence index, verification), CSV + PDF renderings,
 * packHash = sha256hex(canonical(bundle)), then the AUDIT_PACK_EXPORTED
 * ledger block records that pack hash.
 */
export async function buildAuditPack(
  input: AuditPackInput,
  deps: AuditPackDeps,
): Promise<BuiltAuditPack> {
  const domainFilter = input.domains && input.domains.length > 0 ? new Set(input.domains) : null;

  const inPeriod = (timestamp: string): boolean => timestamp >= input.from && timestamp <= input.to;
  const findings: PackFinding[] = deps.alerts
    .filter((alert) => inPeriod(alert.createdAt) && (!domainFilter || domainFilter.has(alert.domain)))
    .map((alert) => ({
      alertId: alert.id,
      ruleId: alert.ruleId,
      domain: alert.domain,
      severity: alert.severity,
      riskScore: alert.riskScore,
      status: alert.status,
      subjectId: alert.subject.id,
      subjectName: alert.subject.name,
      summarySentence: alert.summarySentence,
      riskReasons: alert.riskReasons,
      policyChunkIds: alert.policyRefs.map((ref) => ref.chunkId),
      createdAt: alert.createdAt,
      slaDueAt: alert.slaDueAt,
      decision: decisionFor(alert.id, deps.ledger.blocks),
    }))
    .sort((a, b) => b.riskScore - a.riskScore || a.createdAt.localeCompare(b.createdAt));

  const perRuleCounts = new Map<string, number>();
  for (const finding of findings) {
    perRuleCounts.set(finding.ruleId, (perRuleCounts.get(finding.ruleId) ?? 0) + 1);
  }

  const openRuleIds = new Set(
    deps.alerts.filter((alert) => alert.status === "open").map((alert) => alert.ruleId),
  );
  const checkRuns = deps.checkRuns;
  const latestRun = checkRuns[checkRuns.length - 1];
  const passingChecks = derivePassingChecks(deps.obligations, openRuleIds, latestRun?.asOf);
  const coverageItems = computeCoverage({
    obligations: deps.obligations,
    passingChecks,
    asOf: input.to,
  });

  const evidenceIndex = deps.evidence
    .filter((item) => inPeriod(item.collectedAt))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      source: item.source,
      collectedAt: item.collectedAt,
      contentHash: item.contentHash,
      ledgerBlockIndex: item.ledgerBlockIndex,
    }));

  const chain = verifyChain(deps.ledger.blocks, deps.evidence);
  let rehashed = 0;
  let contentHashesOk = true;
  let evidenceHashesOk = true;
  for (const item of deps.evidence) {
    const block = deps.ledger.blocks[item.ledgerBlockIndex];
    const payloadOk =
      block !== undefined &&
      block.eventType === "EVIDENCE_RECORDED" &&
      block.payload["evidenceId"] === item.id &&
      block.payload["contentHash"] === item.contentHash;
    if (!payloadOk) evidenceHashesOk = false;
    if (item.content !== undefined) {
      rehashed += 1;
      if (sha256hex(canonical(item.content)) !== item.contentHash) contentHashesOk = false;
    }
  }

  const bundle: AuditPackBundle = {
    scope: {
      from: input.from,
      to: input.to,
      domains: domainFilter ? [...domainFilter].sort() : ["all"],
      generatedBy: input.generatedBy,
      generatedAt: deps.clock.now(),
      methodStatement: METHOD_STATEMENT,
    },
    checkSummary: {
      runs: checkRuns.length,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            asOf: latestRun.asOf,
            rulesRun: latestRun.rulesRun,
            subjectsChecked: latestRun.subjectsChecked,
            passed: latestRun.passed,
            failed: latestRun.failed,
          }
        : null,
      findingsPerRule: [...perRuleCounts.entries()]
        .map(([ruleId, count]) => ({ ruleId, findings: count }))
        .sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
    },
    findings,
    coverage: { headline: coverageHeadline(coverageItems), items: coverageItems },
    evidenceIndex,
    verification: {
      chainOk: chain.ok,
      checked: chain.ok ? chain.checked : 0,
      firstBrokenIndex: chain.ok ? null : chain.firstBrokenIndex,
      failureReason: chain.ok ? null : chain.reason,
      evidenceHashesOk,
      contentHashesRehashed: rehashed,
      contentHashesOk,
      headHash: headHash(deps.ledger.blocks),
    },
  };

  const packHash = sha256hex(canonical(bundle));
  const block = deps.ledger.append({
    eventType: "AUDIT_PACK_EXPORTED",
    actor: `${input.generatedBy}@complianceiq.test`,
    payload: {
      packHash,
      from: input.from,
      to: input.to,
      findings: findings.length,
      evidence: evidenceIndex.length,
      headHashAtExport: bundle.verification.headHash,
    },
  });

  const csv = [
    ["id", "kind", "title", "source", "collectedAt", "contentHash", "ledgerBlockIndex"]
      .map(csvCell)
      .join(","),
    ...evidenceIndex.map((item) =>
      [
        item.id,
        item.kind,
        item.title,
        item.source,
        item.collectedAt,
        item.contentHash,
        String(item.ledgerBlockIndex),
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");

  const sections: PdfSection[] = [
    {
      heading: "Scope",
      lines: [
        `Period: ${input.from} to ${input.to}`,
        `Domains: ${bundle.scope.domains.join(", ")}`,
        `Generated by: ${input.generatedBy} at ${bundle.scope.generatedAt}`,
        "",
        bundle.scope.methodStatement,
      ],
    },
    {
      heading: "Check summary",
      lines: [
        `Check runs recorded: ${bundle.checkSummary.runs}`,
        bundle.checkSummary.latestRun
          ? `Latest run ${bundle.checkSummary.latestRun.id} at ${bundle.checkSummary.latestRun.asOf}: ` +
              `${bundle.checkSummary.latestRun.rulesRun} rules, ` +
              `${bundle.checkSummary.latestRun.subjectsChecked} subjects, ` +
              `${bundle.checkSummary.latestRun.passed} passed, ${bundle.checkSummary.latestRun.failed} failed.`
          : "No check runs recorded in this state.",
        ...bundle.checkSummary.findingsPerRule.map(
          (row) => `${row.ruleId}: ${row.findings} finding(s) in period.`,
        ),
      ],
    },
    {
      heading: `Findings (${findings.length})`,
      lines: findings.flatMap((finding) => [
        `${finding.severity} ${finding.ruleId} [${finding.status}] risk=${finding.riskScore} — ${finding.summarySentence}`,
        `  Subject: ${finding.subjectName} (${finding.subjectId}); domain=${finding.domain}; created=${finding.createdAt}; slaDue=${finding.slaDueAt}`,
        `  Reasons: ${finding.riskReasons.join("; ")}`,
        `  Citations: ${finding.policyChunkIds.join(", ") || "none"}`,
        finding.decision
          ? `  Decision: ${finding.decision.eventType} by ${finding.decision.decider} at ${finding.decision.at}${finding.decision.reason ? ` — ${finding.decision.reason}` : ""}`
          : "  Decision: none recorded",
      ]),
    },
    {
      heading: "Coverage",
      lines: [
        bundle.coverage.headline,
        ...bundle.coverage.items.map((item) => `${item.status} ${item.obligationId} — ${item.reason}`),
      ],
    },
    {
      heading: `Evidence index (${evidenceIndex.length})`,
      lines: evidenceIndex.map(
        (item) => `${item.id} — ${item.title} (${item.kind}) collected ${item.collectedAt}; sha256=${item.contentHash}; ledger block #${item.ledgerBlockIndex}`,
      ),
    },
    {
      heading: "Verification",
      lines: [
        `Chain: ${bundle.verification.chainOk ? "verified" : `BROKEN at #${bundle.verification.firstBrokenIndex} (${bundle.verification.failureReason})`}; blocks checked: ${bundle.verification.checked}`,
        `Evidence hashes vs ledger payloads: ${bundle.verification.evidenceHashesOk ? "all match" : "MISMATCH"}`,
        `Evidence content re-hashed: ${bundle.verification.contentHashesRehashed} item(s); ${bundle.verification.contentHashesOk ? "all match" : "MISMATCH"}`,
        `Head hash: ${bundle.verification.headHash ?? "none"}`,
        `Pack hash (sha256 of this bundle): ${packHash}`,
      ],
    },
  ];

  const pdfBase64 = await buildTextPdf(
    `ComplianceIQ audit pack — ${input.from} to ${input.to}`,
    sections,
  );

  return { bundle, csv, pdfBase64, packHash, ledgerBlockIndex: block.blockIndex };
}
