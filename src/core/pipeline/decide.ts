import type { Clock } from "../clock";
import type { AnyRuleModule } from "../engine/types";
import { assessRisk, severityAfterRisk } from "../engine/risk";
import { slaDueAt } from "../engine/sla";
import type { Ledger } from "../ledger";
import { nextBlockIndex } from "../ledger";
import type { EvidenceLocker } from "../evidence";
import type { Repo } from "../repo/repo";
import { loadCorpus, type Corpus } from "../rag/corpus";
import { loadEmbeddings, type Embeddings } from "../rag/embeddings";
import { retrievePolicyRefs } from "../rag/retrieve";
import type { Alert, RuleContext, RuleResult } from "../types";
import { Alert as AlertSchema } from "../types";
import { subjectSnapshot } from "./snapshot";

export interface AlertDeps {
  ledger: Ledger;
  repo: Repo;
  evidence: EvidenceLocker;
  clock: Clock;
  corpus?: Corpus;
  embeddings?: Embeddings;
  actor?: string;
}

let corpusSingleton: Corpus | undefined;
let embeddingsSingleton: Embeddings | undefined;

function corpusOf(deps: AlertDeps): Corpus {
  if (deps.corpus) return deps.corpus;
  return (corpusSingleton ??= loadCorpus());
}

function embeddingsOf(deps: AlertDeps): Embeddings {
  if (deps.embeddings) return deps.embeddings;
  return (embeddingsSingleton ??= loadEmbeddings());
}

/**
 * An existing alert on the same rule + subject blocks a new one unless it was
 * closed because the condition cleared — that is what makes re-expiry open a
 * new alert (MASTER §11) while a dismissed or decided case stays put.
 */
export function blocksRealert(alert: Alert): boolean {
  return !(alert.status === "resolved" && alert.resolvedReason === "condition_cleared");
}

export interface BuildAlertInput {
  rule: AnyRuleModule;
  result: RuleResult;
  ctx: RuleContext;
  /** Alerts already stored for this rule + subject (any status). */
  existing: readonly Alert[];
}

function snapshotContent(result: RuleResult, ctx: RuleContext, note?: string) {
  return {
    ruleId: result.ruleId,
    ruleVersion: result.ruleVersion,
    verdict: result.verdict,
    subject: result.subject,
    observed: result.observed,
    parameters: result.parameters,
    triggeringRefs: result.triggeringRefs,
    asOf: ctx.asOf,
    ...(note ? { note } : {}),
    registers: subjectSnapshot(ctx.registers, result.subject.id),
  };
}

/**
 * Creates an alert for a failing result (§7.2 steps 4–6): snapshot evidence,
 * score, SLA, policy refs, ledger ALERT_TRIGGERED. Returns null when an
 * existing alert already covers this rule + subject.
 */
export function buildAlert(input: BuildAlertInput, deps: AlertDeps): Alert | null {
  const { rule, result, ctx, existing } = input;
  if (existing.some(blocksRealert)) return null;

  const baseSeverity = rule.severityFor?.(result) ?? rule.meta.severity;
  const history = {
    priorAlerts: deps.repo.alerts.list().filter((alert) => alert.subject.id === result.subject.id),
  };
  const { riskScore, riskReasons } = assessRisk(rule, result, ctx, {
    history: { priorAlerts: history.priorAlerts.map((a) => ({ subjectId: a.subject.id, createdAt: a.createdAt })) },
    params: rule.defaultParams,
  });
  const severity = severityAfterRisk(baseSeverity, riskScore);
  const summarySentence = rule.summarize(result);
  const createdAt = deps.clock.now();

  const snapshot = deps.evidence.record(
    "record_snapshot",
    `${rule.meta.name} — ${result.subject.name}`,
    snapshotContent(result, ctx),
    { type: "record", id: result.subject.id },
  );

  const alertId = `alrt_${nextBlockIndex(deps.ledger)}`;
  deps.ledger.append({
    eventType: "ALERT_TRIGGERED",
    actor: deps.actor ?? "pipeline@complianceiq.test",
    alertId,
    payload: {
      ruleId: result.ruleId,
      severity,
      riskScore,
      subjectId: result.subject.id,
      snapshotEvidenceIds: [snapshot.id],
    },
  });

  const policyRefs = retrievePolicyRefs(
    result.ruleId,
    `${rule.meta.name}. ${summarySentence}`,
    corpusOf(deps),
    embeddingsOf(deps),
  );

  return AlertSchema.parse({
    id: alertId,
    ruleId: result.ruleId,
    ruleVersion: result.ruleVersion,
    domain: rule.meta.domain,
    severity,
    riskScore,
    riskReasons,
    summarySentence,
    subject: result.subject,
    evidenceRefs: result.triggeringRefs,
    snapshotEvidenceIds: [snapshot.id],
    result,
    policyRefs,
    status: "open",
    createdAt,
    slaDueAt: slaDueAt(severity, createdAt),
  });
}

/**
 * Auto-resolves an alert whose condition no longer fails (§7.3 step 4):
 * snapshots the cleared state, appends ALERT_AUTO_RESOLVED, updates the alert.
 */
export function resolveAlert(
  alert: Alert,
  passingResult: RuleResult | undefined,
  ctx: RuleContext,
  deps: AlertDeps,
): Alert {
  const content = passingResult
    ? snapshotContent(passingResult, ctx)
    : {
        ruleId: alert.ruleId,
        verdict: "pass" as const,
        subject: alert.subject,
        asOf: ctx.asOf,
        note: "Subject produced no failing result in this run.",
        registers: subjectSnapshot(ctx.registers, alert.subject.id),
      };

  const snapshot = deps.evidence.record(
    "record_snapshot",
    `Condition cleared — ${alert.ruleId} ${alert.subject.name}`,
    content,
    { type: "record", id: alert.subject.id },
  );

  deps.ledger.append({
    eventType: "ALERT_AUTO_RESOLVED",
    actor: deps.actor ?? "pipeline@complianceiq.test",
    alertId: alert.id,
    payload: {
      alertId: alert.id,
      ruleId: alert.ruleId,
      evidenceId: snapshot.id,
      asOf: ctx.asOf,
    },
  });

  const updated = AlertSchema.parse({
    ...alert,
    status: "resolved" as const,
    resolvedReason: "condition_cleared" as const,
    snapshotEvidenceIds: [...alert.snapshotEvidenceIds, snapshot.id],
  });
  deps.repo.alerts.update(alert.id, {
    status: updated.status,
    resolvedReason: updated.resolvedReason,
    snapshotEvidenceIds: updated.snapshotEvidenceIds,
  });
  return updated;
}

export type Decision = "file" | "dismiss" | "escalate";

const DECISION_STATUS: Record<Decision, "filed" | "dismissed" | "escalated"> = {
  file: "filed",
  dismiss: "dismissed",
  escalate: "escalated",
};

const DECISION_EVENT: Record<Decision, "REPORT_FILED" | "ALERT_DISMISSED" | "ALERT_ESCALATED"> = {
  file: "REPORT_FILED",
  dismiss: "ALERT_DISMISSED",
  escalate: "ALERT_ESCALATED",
};

export interface RecordDecisionInput {
  alertId: string;
  decision: Decision;
  /** Required when decision is "dismiss" — a dismissal without a reason is refused. */
  reason?: string;
  /** Who decided (the caller's role identity, e.g. "officer"). */
  decider: string;
  note?: string;
}

export interface RecordDecisionOutcome {
  alert: Alert;
  blockIndex: number;
}

/**
 * Records a human decision on an open alert (§7.4 "File report" flow, §8
 * roles): filed / dismissed / escalated, each as a ledger block. Decided
 * cases stay decided — blocksRealert keeps them from reopening.
 */
export function recordDecision(
  input: RecordDecisionInput,
  deps: AlertDeps,
): RecordDecisionOutcome {
  const alert = deps.repo.alerts.get(input.alertId);
  if (!alert) throw new Error(`Alert not found: ${input.alertId}`);
  if (alert.status !== "open" && alert.status !== "in_review") {
    throw new Error(`Alert ${alert.id} is ${alert.status} and cannot be decided again.`);
  }
  const reason = input.reason?.trim();
  if (input.decision === "dismiss" && !reason) {
    throw new Error("A dismissal requires a reason.");
  }

  const status = DECISION_STATUS[input.decision];
  const block = deps.ledger.append({
    eventType: DECISION_EVENT[input.decision],
    actor: input.decider,
    alertId: alert.id,
    payload: {
      alertId: alert.id,
      ruleId: alert.ruleId,
      decision: input.decision,
      decider: input.decider,
      ...(reason ? { reason } : {}),
      ...(input.note ? { note: input.note } : {}),
      at: deps.clock.now(),
    },
  });

  deps.repo.alerts.update(alert.id, { status });
  return { alert: { ...alert, status }, blockIndex: block.blockIndex };
}
