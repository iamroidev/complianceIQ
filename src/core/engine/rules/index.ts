import type { AnyRuleModule, RuleKind } from "../types";
import { aml001 } from "./event/aml-001";
import { fin001 } from "./event/fin-001";
import { iam001 } from "./event/iam-001";
import { hipaa001 } from "./event/hipaa-001";
import { dev001 } from "./event/dev-001";
import { cert001 } from "./state/cert-001";
import { dead001 } from "./state/dead-001";
import { vend001 } from "./state/vend-001";

export const TIER1_EVENT_RULES: AnyRuleModule[] = [aml001, fin001, iam001, hipaa001, dev001];

export const TIER1_STATE_RULES: AnyRuleModule[] = [cert001, dead001, vend001];

export const TIER1_RULES: AnyRuleModule[] = [...TIER1_EVENT_RULES, ...TIER1_STATE_RULES];

export function getRule(ruleId: string): AnyRuleModule | undefined {
  return TIER1_RULES.find((rule) => rule.meta.id === ruleId);
}

export function rulesOfKind(kind: RuleKind): AnyRuleModule[] {
  return TIER1_RULES.filter((rule) => rule.kind === kind);
}
