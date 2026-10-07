import type { Alert, IsoUtcMs, Obligation, PolicyDocument } from "../types";
import type { AnyRuleModule } from "../engine/types";
import type { Corpus } from "../rag/corpus";

/**
 * The single fact block used for BOTH the prompt and the fact validator
 * (§7.4: "prompt contains only supplied facts and clause text, each with
 * ids"). Anything the model may legitimately say must appear here.
 */
export function buildAlertFacts(alert: Alert, rule: AnyRuleModule, corpus: Corpus): string {
  const lines: string[] = [
    `alertId: ${alert.id}`,
    `ruleId: ${alert.ruleId} (version ${alert.ruleVersion})`,
    `ruleName: ${rule.meta.name}`,
    `ruleDescription: ${rule.meta.description}`,
    `dossier: ${rule.meta.dossier}`,
    `domain: ${alert.domain}`,
    `severity: ${alert.severity}`,
    `riskScore: ${alert.riskScore}`,
    `riskReasons: ${alert.riskReasons.join("; ") || "(none)"}`,
    `summary: ${alert.summarySentence}`,
    `subject: ${alert.subject.id} — ${alert.subject.name}`,
    `status: ${alert.status}`,
    `createdAt: ${alert.createdAt}`,
    `slaDueAt: ${alert.slaDueAt}`,
    `parameters: ${JSON.stringify(alert.result.parameters)}`,
    `observed: ${JSON.stringify(alert.result.observed)}`,
    `evidenceRefs: ${
      alert.evidenceRefs.map((ref) => `${ref.type}:${ref.id}`).join(", ") || "(none)"
    }`,
    `snapshotEvidenceIds: ${alert.snapshotEvidenceIds.join(", ") || "(none)"}`,
  ];
  for (const ref of alert.policyRefs) {
    const clause = corpus.byChunkId.get(ref.chunkId);
    lines.push(
      `policyChunk ${ref.chunkId} (${ref.reason}): ${clause ? `${clause.title} — ${clause.text}` : "(missing)"}`,
    );
  }
  return lines.join("\n");
}

/** §7.4 F: the supplied facts a suggested order may draw reasons from. */
export function buildPriorityFacts(alerts: readonly Alert[], asOf: IsoUtcMs): string {
  const lines: string[] = [`asOf: ${asOf}`];
  for (const alert of alerts) {
    const remainingHours = Math.floor((Date.parse(alert.slaDueAt) - Date.parse(asOf)) / 3_600_000);
    lines.push(
      [
        `alert ${alert.id}:`,
        `severity ${alert.severity},`,
        `riskScore ${alert.riskScore},`,
        `riskReasons ${alert.riskReasons.join("; ") || "(none)"},`,
        `slaDueAt ${alert.slaDueAt},`,
        `slaRemainingHours ${remainingHours},`,
        `subject ${alert.subject.id} — ${alert.subject.name},`,
        `ruleId ${alert.ruleId},`,
        `summary ${alert.summarySentence}`,
      ].join(" "),
    );
  }
  return lines.join("\n");
}

/** §7.4 E: the supplied facts a gap suggestion may draw its prose from. */
export function buildGapFacts(
  obligation: Obligation,
  document: PolicyDocument,
  knownRuleIds: readonly string[] = [],
): string {
  return [
    `obligationId: ${obligation.id}`,
    `title: ${obligation.title}`,
    `description: ${obligation.plainDescription}`,
    `kind: ${obligation.kind}`,
    `cadence: ${obligation.cadence ?? "(none)"}`,
    `status: ${obligation.status}`,
    `quote: ${obligation.source.quote}`,
    `documentId: ${document.id}`,
    `documentTitle: ${document.title}`,
    `evidenceRequired: ${obligation.evidenceRequired?.join(", ") || "(none)"}`,
    `ruleIds: ${obligation.ruleIds.join(", ") || "(none)"}`,
    `knownRuleIds: ${knownRuleIds.join(", ") || "(none)"}`,
  ].join("\n");
}
