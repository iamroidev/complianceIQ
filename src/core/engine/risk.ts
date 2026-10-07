import type { RuleContext, RuleResult, Severity } from "../types";
import type { AnyRuleModule, RiskHistory, TriggeredRiskFactor } from "./types";

const BASE_BY_SEVERITY: Record<Severity, number> = {
  critical: 45,
  high: 35,
  medium: 25,
  low: 15,
};

export interface RiskAssessment {
  riskScore: number;
  riskReasons: string[];
}

export interface AssessOptions {
  history?: RiskHistory;
  params?: Record<string, unknown>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function byPointsThenText(left: TriggeredRiskFactor, right: TriggeredRiskFactor): number {
  if (left.points !== right.points) return right.points - left.points;
  return left.reason < right.reason ? -1 : left.reason > right.reason ? 1 : 0;
}

/** riskScore = clamp(0, 100, base(ruleId) + Σ factorPoints); reasons are the top 3 factors. */
export function assessRisk(
  rule: AnyRuleModule,
  result: RuleResult,
  ctx: RuleContext,
  options?: AssessOptions,
): RiskAssessment {
  const severity = rule.severityFor?.(result) ?? rule.meta.severity;
  const base = BASE_BY_SEVERITY[severity];
  const factors = rule.riskFactors({
    result,
    ctx,
    params: options?.params ?? rule.defaultParams,
    history: options?.history,
  });
  const total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const riskReasons = [...factors]
    .sort(byPointsThenText)
    .slice(0, 3)
    .map((factor) => factor.reason);
  return { riskScore: clamp(0, 100, base + total), riskReasons };
}

/** Bands may raise severity above the rule default, never lower it. */
export function severityAfterRisk(defaultSeverity: Severity, riskScore: number): Severity {
  const order: Severity[] = ["low", "medium", "high", "critical"];
  let severity = defaultSeverity;
  const current = order.indexOf(severity);
  if (riskScore >= 70 && current < 3) severity = "critical";
  else if (riskScore >= 60 && current < 2) severity = "high";
  else if (riskScore >= 50 && current < 1) severity = "medium";
  return severity;
}
