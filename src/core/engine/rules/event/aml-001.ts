import type { RuleContext, RuleResult, Severity } from "../../../types";
import type { RiskInput, RuleModule, TriggeredRiskFactor } from "../../types";
import { daysBetween, formatLimit, formatUsd } from "../../format";

type AmlParams = {
  bandMin: number;
  bandMax: number;
  windowHours: number;
  minCount: number;
  limit: number;
}

const defaultParams: AmlParams = {
  bandMin: 9_000,
  bandMax: 9_999.99,
  windowHours: 48,
  minCount: 2,
  limit: 10_000,
};

function amountsText(amounts: number[]): string {
  const formatted = amounts.map((amount) => `USD ${formatUsd(amount)}`);
  if (formatted.length === 1) return formatted[0];
  return `${formatted.slice(0, -1).join(", ")} and ${formatted[formatted.length - 1]}`;
}

export const aml001: RuleModule<AmlParams> = {
  meta: {
    id: "AML-001",
    name: "Structuring: deposits just under the reporting limit",
    description:
      "Same subject makes at least two cash deposits each inside the just-under-limit band, cumulatively over the limit, within the rolling window.",
    domain: "identity",
    severity: "high",
    tier: 1,
    kind: "event",
    dossier: "sar",
  },
  defaultParams,
  kind: "event",

  evaluate(ctx: RuleContext, overrides?: Partial<AmlParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const deposits = ctx.events.filter(
      (event) =>
        event.action === "cash_deposit" &&
        (event.context.currency ?? "USD") === "USD" &&
        typeof event.context.amount === "number",
    );
    const byActor = new Map<string, typeof deposits>();
    for (const deposit of deposits) {
      const group = byActor.get(deposit.actor.id) ?? [];
      group.push(deposit);
      byActor.set(deposit.actor.id, group);
    }
    const results: RuleResult[] = [];
    for (const group of byActor.values()) {
      const ordered = [...group].sort((left, right) =>
        left.timestamp < right.timestamp ? -1 : left.timestamp > right.timestamp ? 1 : 0,
      );
      const inBand = ordered.filter(
        (deposit) =>
          (deposit.context.amount as number) >= params.bandMin &&
          (deposit.context.amount as number) <= params.bandMax,
      );
      const subject = { id: ordered[0].actor.id, name: ordered[0].actor.name };
      const parameters = {
        bandMin: params.bandMin,
        bandMax: params.bandMax,
        windowHours: params.windowHours,
        minCount: params.minCount,
        limit: params.limit,
      };

      let fired: typeof inBand | null = null;
      for (let start = 0; start < inBand.length && !fired; start += 1) {
        const windowStart = Date.parse(inBand[start].timestamp);
        const windowEnd = windowStart + params.windowHours * 3_600_000;
        const subset = inBand.filter((deposit) => {
          const at = Date.parse(deposit.timestamp);
          return at >= windowStart && at <= windowEnd;
        });
        const total = subset.reduce((sum, deposit) => sum + (deposit.context.amount as number), 0);
        if (subset.length >= params.minCount && total >= params.limit) fired = subset;
      }

      if (fired) {
        const amounts = fired.map((deposit) => deposit.context.amount as number);
        const total = amounts.reduce((sum, amount) => sum + amount, 0);
        const spanHours = Math.round(
          (Date.parse(fired[fired.length - 1].timestamp) - Date.parse(fired[0].timestamp)) /
            3_600_000,
        );
        results.push({
          ruleId: "AML-001",
          ruleVersion: "1",
          verdict: "fail",
          subject,
          triggeringRefs: fired.map((deposit) => ({ type: "event" as const, id: deposit.id })),
          observed: {
            subjectName: subject.name,
            depositCount: fired.length,
            totalAmount: total,
            amountsText: amountsText(amounts),
            spanHours,
            limit: params.limit,
          },
          parameters,
        });
      } else {
        results.push({
          ruleId: "AML-001",
          ruleVersion: "1",
          verdict: "pass",
          subject,
          triggeringRefs: [],
          observed: {
            subjectName: subject.name,
            depositCount: inBand.length,
          },
          parameters,
        });
      }
    }
    return results;
  },

  riskFactors({ result, ctx, params, history }: RiskInput<AmlParams>): TriggeredRiskFactor[] {
    const factors: TriggeredRiskFactor[] = [];
    const minCount = params.minCount ?? defaultParams.minCount;
    const limit = params.limit ?? defaultParams.limit;
    const count = Number(result.observed.depositCount ?? 0);
    const extra = count - minCount;
    if (extra > 0) {
      factors.push({
        points: 10 * extra,
        reason: `${count} deposits in the band, above the ${minCount} minimum`,
      });
    }
    const total = Number(result.observed.totalAmount ?? 0);
    if (total >= 2 * limit) {
      factors.push({ points: 15, reason: "Combined amount reached twice the reporting limit" });
    }
    const prior = (history?.priorAlerts ?? []).filter(
      (alert) =>
        alert.subjectId === result.subject.id &&
        alert.createdAt <= ctx.asOf &&
        daysBetween(alert.createdAt, ctx.asOf) <= 90,
    );
    if (prior.length > 0) {
      factors.push({ points: 10, reason: "A prior alert for this subject in the last 90 days" });
    }
    return factors;
  },

  severityFor(result: RuleResult): Severity {
    const count = Number(result.observed.depositCount ?? 0);
    const total = Number(result.observed.totalAmount ?? 0);
    return count >= 3 || total >= 25_000 ? "critical" : "high";
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    if (result.verdict === "pass") {
      const count = Number(observed.depositCount ?? 0);
      return `${String(observed.subjectName)} made ${count} deposit${count === 1 ? "" : "s"} in the just-under-limit band without ${defaultParams.minCount} inside the rolling window and over the limit.`;
    }
    return `${String(observed.subjectName)} made ${String(observed.depositCount)} cash deposits of ${String(observed.amountsText)} within ${String(observed.spanHours)} hours, each just under the USD ${formatLimit(Number(observed.limit))} reporting limit.`;
  },
};
