import { assertIsoUtcMs } from "../clock";
import { runStateRules } from "../engine/evaluate";
import { TIER1_STATE_RULES } from "../engine/rules/index";
import type { AnyRuleModule } from "../engine/types";
import { applyResponses } from "../responses/apply";
import { createResponseExecutor } from "../responses/executor";
import type { ResponseSettings, ResponseSuggestion } from "../responses/response-rules";
import type { Alert, CheckRun, Registers, RuleContext } from "../types";
import { CheckRun as CheckRunSchema } from "../types";
import type { AlertDeps } from "./decide";
import { buildAlert, resolveAlert } from "./decide";

export interface RunChecksInput {
  asOf: string;
  registers: Registers;
  /** State rules to run; defaults to the Tier 1 state rules (§7.3 step 2). */
  rules?: AnyRuleModule[];
  /** Response settings for newly opened alerts (§7.9); defaults to suggest. */
  responseSettings?: ResponseSettings;
}

export interface RunChecksOutcome {
  checkRun: CheckRun;
  opened: Alert[];
  resolved: Alert[];
  /** §7.9 suggestions for alerts opened in this run (automatic ones execute as ledger blocks). */
  responses: ResponseSuggestion[];
}

/**
 * Scheduled state checks (MASTER §7.3): run every state rule, open an alert
 * for each failure not already covered, auto-resolve open alerts whose
 * condition cleared, then store a CheckRun and append CHECK_RUN (proof that
 * monitoring ran, passes included).
 */
export function runChecks(input: RunChecksInput, deps: AlertDeps): RunChecksOutcome {
  assertIsoUtcMs(input.asOf, "runChecks asOf");
  const actor = deps.actor ?? "scheduler@complianceiq.test";
  const rules = (input.rules ?? TIER1_STATE_RULES).filter((rule) => rule.kind === "state");
  const ctx: RuleContext = { events: [], registers: input.registers, asOf: input.asOf };
  const results = runStateRules(rules, ctx);
  const failures = results.filter((result) => result.verdict === "fail");
  const failKeys = new Set(failures.map((f) => `${f.ruleId}::${f.subject.id}`));
  const ruleDeps: AlertDeps = deps.actor ? deps : { ...deps, actor };

  // §7.3 step 3 — open an alert for each failure not already covered.
  const opened: Alert[] = [];
  for (const result of failures) {
    const rule = rules.find((candidate) => candidate.meta.id === result.ruleId);
    if (!rule) continue;
    const existing = deps.repo.alerts.findByRuleSubject(result.ruleId, result.subject.id);
    const alert = buildAlert({ rule, result, ctx, existing }, ruleDeps);
    if (alert) {
      deps.repo.alerts.add(alert);
      opened.push(alert);
    }
  }

  // §7.9 — evaluate response rules for alerts opened in this run; automatic
  // responses reverse themselves when the condition clears (below).
  const applied = applyResponses(opened, input.responseSettings, { ledger: deps.ledger });

  // §7.3 step 4 — auto-resolve open state alerts whose condition no longer fails.
  const executed = new Set(rules.map((rule) => rule.meta.id));
  const resolved: Alert[] = [];
  for (const alert of deps.repo.alerts.list()) {
    if (alert.status !== "open" || !executed.has(alert.ruleId)) continue;
    if (failKeys.has(`${alert.ruleId}::${alert.subject.id}`)) continue;
    const passing = results.find(
      (result) =>
        result.ruleId === alert.ruleId &&
        result.subject.id === alert.subject.id &&
        result.verdict === "pass",
    );
    resolved.push(resolveAlert(alert, passing, ctx, ruleDeps));
  }

  // §7.9 — automatic responses reverse themselves when the condition clears.
  if (resolved.length > 0) {
    const executor = createResponseExecutor({ ledger: deps.ledger });
    for (const alert of resolved) executor.reverseForAlert(alert.id);
  }

  // §7.3 step 5 — store the CheckRun and prove the run on the ledger.
  const subjectIds = new Set(results.map((result) => result.subject.id));
  const counts = {
    rulesRun: rules.length,
    subjectsChecked: subjectIds.size,
    passed: results.filter((result) => result.verdict === "pass").length,
    failed: failures.length,
    opened: opened.length,
    resolved: resolved.length,
  };
  const block = deps.ledger.append({
    eventType: "CHECK_RUN",
    actor,
    payload: { asOf: input.asOf, ...counts },
  });
  const checkRun = CheckRunSchema.parse({
    id: `chk_${block.blockIndex}`,
    asOf: input.asOf,
    ...counts,
    ledgerBlockIndex: block.blockIndex,
  });
  deps.repo.checkRuns.add(checkRun);

  return { checkRun, opened, resolved, responses: applied.suggestions };
}
