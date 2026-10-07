import type { RuleContext, RuleResult } from "../../../types";
import type { RuleModule } from "../../types";
import { formatLimit, formatUsd } from "../../format";

type FinParams = {
  thresholdLow: number;
  approversLow: number;
  thresholdHigh: number;
  approversHigh: number;
}

const defaultParams: FinParams = {
  thresholdLow: 5_000,
  approversLow: 1,
  thresholdHigh: 25_000,
  approversHigh: 2,
};

export const fin001: RuleModule<FinParams> = {
  meta: {
    id: "FIN-001",
    name: "Payment released above the approval limit",
    description:
      "A payment at or above USD 5,000 needs one approver who is not the requester; at or above USD 25,000 it needs two distinct approvers.",
    domain: "finance",
    severity: "high",
    tier: 1,
    kind: "event",
    dossier: "exception_memo",
  },
  defaultParams,
  kind: "event",

  evaluate(ctx: RuleContext, overrides?: Partial<FinParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const results: RuleResult[] = [];
    for (const event of ctx.events) {
      if (event.action !== "payment_released") continue;
      const amount = typeof event.context.amount === "number" ? event.context.amount : 0;
      const requester = typeof event.context.requestedBy === "string"
        ? event.context.requestedBy
        : event.actor.id;
      const rawApprovers = Array.isArray(event.context.approvers)
        ? event.context.approvers.filter((id): id is string => typeof id === "string")
        : [];
      const distinct = [...new Set(rawApprovers.filter((id) => id !== requester))];
      const required =
        amount >= params.thresholdHigh
          ? params.approversHigh
          : amount >= params.thresholdLow
            ? params.approversLow
            : 0;
      const threshold =
        amount >= params.thresholdHigh ? params.thresholdHigh : params.thresholdLow;
      const subject = {
        id: event.resource.id,
        name: event.resource.label ?? event.resource.id,
      };
      const parameters = {
        thresholdLow: params.thresholdLow,
        approversLow: params.approversLow,
        thresholdHigh: params.thresholdHigh,
        approversHigh: params.approversHigh,
      };
      const observed = {
        paymentLabel: subject.name,
        amount,
        requiredApprovers: required,
        actualApprovers: distinct.length,
        threshold,
      };
      results.push({
        ruleId: "FIN-001",
        ruleVersion: "1",
        verdict: required > 0 && distinct.length < required ? "fail" : "pass",
        subject,
        triggeringRefs:
          required > 0 && distinct.length < required
            ? [{ type: "event" as const, id: event.id }]
            : [],
        observed,
        parameters,
      });
    }
    return results;
  },

  riskFactors() {
    return [];
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    const actual = Number(observed.actualApprovers);
    const required = Number(observed.requiredApprovers);
    if (required === 0) {
      return `Payment of USD ${formatUsd(Number(observed.amount))} to ${String(observed.paymentLabel)} is below the approval threshold.`;
    }
    return `Payment of USD ${formatUsd(Number(observed.amount))} to ${String(observed.paymentLabel)} was released with ${actual} distinct approver${actual === 1 ? "" : "s"}; ${required} ${required === 1 ? "is" : "are"} required above USD ${formatLimit(Number(observed.threshold))}.`;
  },
};
