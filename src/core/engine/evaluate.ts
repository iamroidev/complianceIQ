import type { RuleContext, RuleResult } from "../types";
import type { AnyRuleModule, RuleKind } from "./types";

/** Event rules run against a loaded history window (pipeline §7.2 step 3). */
export function runEventRules(rules: AnyRuleModule[], ctx: RuleContext): RuleResult[] {
  return rules.filter((rule) => rule.kind === "event").flatMap((rule) => rule.evaluate(ctx));
}

/** State rules run over registers as of a clock time (run-checks §7.3 step 2). */
export function runStateRules(rules: AnyRuleModule[], ctx: RuleContext): RuleResult[] {
  return rules.filter((rule) => rule.kind === "state").flatMap((rule) => rule.evaluate(ctx));
}

export function runRules(
  rules: AnyRuleModule[],
  ctx: RuleContext,
  kind?: RuleKind,
): RuleResult[] {
  const selected = kind ? rules.filter((rule) => rule.kind === kind) : rules;
  return selected.flatMap((rule) => rule.evaluate(ctx));
}
