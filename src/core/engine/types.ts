import type { DossierKind, Domain, RuleContext, RuleResult, Severity } from "../types";

export type RuleKind = "event" | "state";

export interface RuleMeta {
  id: string;
  name: string;
  description: string;
  domain: Domain;
  severity: Severity;
  tier: 1 | 2 | 3;
  kind: RuleKind;
  dossier: DossierKind;
}

export interface TriggeredRiskFactor {
  points: number;
  reason: string;
}

export interface RiskHistory {
  priorAlerts?: { subjectId: string; createdAt: string }[];
}

export interface RiskInput<P extends Record<string, unknown> = Record<string, unknown>> {
  result: RuleResult;
  ctx: RuleContext;
  params: P;
  history?: RiskHistory;
}

/** Every rule module exports exactly what MASTER §6.1 requires. */
export interface RuleModule<P extends Record<string, unknown> = Record<string, unknown>> {
  meta: RuleMeta;
  defaultParams: P;
  kind: RuleKind;
  evaluate(ctx: RuleContext, params?: Partial<P>): RuleResult[];
  riskFactors(input: RiskInput<P>): TriggeredRiskFactor[];
  summarize(result: RuleResult): string;
  severityFor?(result: RuleResult): Severity;
}

export type AnyRuleModule = RuleModule<Record<string, unknown>>;
