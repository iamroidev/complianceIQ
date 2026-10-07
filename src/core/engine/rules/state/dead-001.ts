import type { RuleContext, RuleResult, Severity } from "../../../types";
import type { RuleModule } from "../../types";
import { daysBetween, formatUtcDate, utcDay } from "../../format";

type DeadParams = {
  warningDays: number;
}

const defaultParams: DeadParams = { warningDays: 14 };

export const dead001: RuleModule<DeadParams> = {
  meta: {
    id: "DEAD-001",
    name: "Obligation deadline missed or approaching",
    description:
      "A confirmed obligation with no completion evidence is inside the warning window (warning) or already past due (breach).",
    domain: "regulatory",
    severity: "medium",
    tier: 1,
    kind: "state",
    dossier: "exception_memo",
  },
  defaultParams,
  kind: "state",

  evaluate(ctx: RuleContext, overrides?: Partial<DeadParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const asOfDay = utcDay(ctx.asOf);
    const results: RuleResult[] = [];
    for (const obligation of ctx.registers.obligations) {
      if (obligation.status !== "confirmed" || !obligation.dueOn) continue;
      const dueDay = utcDay(obligation.dueOn);
      const daysUntil = daysBetween(asOfDay, dueDay);
      const complete = obligation.lastCompletedOn != null;
      const parameters = { warningDays: params.warningDays };
      const common = {
        ruleId: "DEAD-001",
        ruleVersion: "1",
        subject: { id: obligation.id, name: obligation.title },
        parameters,
      };
      if (complete) {
        results.push({
          ...common,
          verdict: "pass",
          triggeringRefs: [],
          observed: {
            obligationTitle: obligation.title,
            dueOn: dueDay,
            mode: "complete",
          },
        });
        continue;
      }
      const mode = daysUntil < 0 ? "breach" : daysUntil <= params.warningDays ? "warning" : "future";
      results.push({
        ...common,
        verdict: mode === "future" ? "pass" : "fail",
        triggeringRefs: mode === "future" ? [] : [{ type: "record" as const, id: obligation.id }],
        observed: {
          obligationTitle: obligation.title,
          dueOn: dueDay,
          mode,
          days: Math.abs(daysUntil),
        },
      });
    }
    return results;
  },

  riskFactors() {
    return [];
  },

  severityFor(result: RuleResult): Severity {
    return result.observed.mode === "breach" ? "critical" : "medium";
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    const title = String(observed.obligationTitle);
    const due = formatUtcDate(String(observed.dueOn));
    const days = Number(observed.days);
    if (observed.mode === "complete") {
      return `${title} has completion evidence recorded. It was due on ${due}.`;
    }
    if (observed.mode === "breach") {
      return `${title} was due on ${due}, ${days} day${days === 1 ? "" : "s"} ago. No completion evidence recorded.`;
    }
    if (days === 0) {
      return `${title} is due today, on ${due}. No completion evidence recorded.`;
    }
    return `${title} is due in ${days} day${days === 1 ? "" : "s"}, on ${due}. No completion evidence recorded.`;
  },
};
