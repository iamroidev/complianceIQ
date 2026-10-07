import type { AnyRuleModule } from "../engine/types";
import { runEventRules } from "../engine/evaluate";
import { TIER1_EVENT_RULES } from "../engine/rules/index";
import type { Alert, ComplianceEvent, Registers } from "../types";
import { ComplianceEvent as ComplianceEventSchema } from "../types";
import { draftAlert } from "../ai/draft";
import { explainAlert } from "../ai/explain";
import type { ResponseSettings, ResponseSuggestion } from "../responses/response-rules";
import { applyResponses } from "../responses/apply";
import type { AlertDeps } from "./decide";
import { buildAlert } from "./decide";

export interface ProcessEventInput {
  /** Raw input; validated by the ComplianceEvent schema (§7.2 step 1). */
  event: unknown;
  registers: Registers;
  /** Event rules to run; defaults to the Tier 1 event rules (§7.2 step 3). */
  rules?: AnyRuleModule[];
  responseSettings?: ResponseSettings;
}

export interface ProcessEventOutcome {
  /** True when this event id was already stored — §7.2 is idempotent per event id. */
  duplicate: boolean;
  event: ComplianceEvent | null;
  alerts: Alert[];
  /** Suggestions under the current modes (§7.9 "suggest"). */
  responses: ResponseSuggestion[];
  /** Ledger-backed executions for responses in automatic mode (§7.9). */
  executed: { responseId: string; blockIndex: number; dryRun: boolean }[];
}

function dedupeKey(ruleId: string, subjectId: string, refs: readonly { type: string; id: string }[]): string {
  const sorted = [...refs]
    .map((ref) => `${ref.type}:${ref.id}`)
    .sort()
    .join(",");
  return `${ruleId}::${subjectId}::${sorted}`;
}

/**
 * The event pipeline (MASTER §7.2): validate and store, run the domain's
 * event rules, open alerts for failures not already alerted (dedupe key =
 * ruleId + subject + sorted evidence refs), generate explanation and draft,
 * then evaluate response rules (§7.9). Idempotent per event id.
 */
export async function processEvent(
  input: ProcessEventInput,
  deps: AlertDeps,
): Promise<ProcessEventOutcome> {
  const parsed = ComplianceEventSchema.safeParse(input.event);
  if (!parsed.success) {
    throw new Error(`Invalid event: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  const event = parsed.data;

  const already = deps.repo.events.get(event.id);
  if (already) {
    return { duplicate: true, event: already, alerts: [], responses: [], executed: [] };
  }
  deps.repo.events.add(event);

  // §7.2 step 2 — the history window is every stored event (demo scale).
  const history = [...deps.repo.events.list()].sort((left, right) =>
    left.timestamp < right.timestamp ? -1 : left.timestamp > right.timestamp ? 1 : 0,
  );
  const ctx = {
    events: history,
    registers: input.registers,
    asOf: deps.clock.now(),
  };

  // §7.2 step 3 — event rules for this event's domain.
  const rules = (input.rules ?? TIER1_EVENT_RULES).filter(
    (rule) => rule.kind === "event" && rule.meta.domain === event.domain,
  );
  const failures = runEventRules(rules, ctx).filter((result) => result.verdict === "fail");

  const opened: Alert[] = [];
  for (const result of failures) {
    const rule = rules.find((candidate) => candidate.meta.id === result.ruleId);
    if (!rule) continue;
    const key = dedupeKey(result.ruleId, result.subject.id, result.triggeringRefs);
    const existing = deps.repo.alerts.findByRuleSubject(result.ruleId, result.subject.id);
    if (existing.some((alert) => dedupeKey(alert.ruleId, alert.subject.id, alert.evidenceRefs) === key)) {
      continue;
    }
    // §7.2 step 4 — same key means already alerted; a different key is a new
    // incident, so lifecycle blocking does not apply to it.
    const alert = buildAlert({ rule, result, ctx, existing: [] }, deps);
    if (!alert) continue;
    deps.repo.alerts.add(alert);
    opened.push(alert);
  }

  // §7.2 steps 5–6: evidence + ALERT_TRIGGERED happened inside buildAlert;
  // policy refs are attached there too. Step 7 — explanation and draft.
  const withArtifacts: Alert[] = [];
  for (const alert of opened) {
    const explanation = await explainAlert(alert);
    const draft = await draftAlert(alert, { clock: deps.clock });
    deps.repo.explanations.add(explanation);
    deps.repo.drafts.add(draft);
    deps.ledger.append({
      eventType: "DRAFT_GENERATED",
      actor: deps.actor ?? "pipeline@complianceiq.test",
      alertId: alert.id,
      payload: {
        alertId: alert.id,
        draftId: draft.id,
        kind: draft.kind,
        generatedBy: draft.generatedBy,
      },
    });
    deps.repo.alerts.update(alert.id, { explanationId: explanation.id, draftId: draft.id });
    withArtifacts.push({
      ...alert,
      explanationId: explanation.id,
      draftId: draft.id,
    });
  }

  // §7.2 step 8 — response rules (§7.9).
  const applied = applyResponses(withArtifacts, input.responseSettings, { ledger: deps.ledger });
  const executed: ProcessEventOutcome["executed"] = applied.executed.map(({ responseId, blockIndex, dryRun }) => ({
    responseId,
    blockIndex,
    dryRun,
  }));

  return { duplicate: false, event, alerts: withArtifacts, responses: applied.suggestions, executed };
}
