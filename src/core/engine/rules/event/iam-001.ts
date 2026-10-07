import type { RuleContext, RuleResult } from "../../../types";
import type { RuleModule } from "../../types";
import { hoursBetween } from "../../format";
import matrix from "../../../../data/rules/sod-matrix.json";

type IamParams = {
  windowHours: number;
}

const defaultParams: IamParams = { windowHours: 24 };

interface SodPair {
  first: string;
  second: string;
  label: string;
}

const pairs: SodPair[] = matrix.pairs;

export const iam001: RuleModule<IamParams> = {
  meta: {
    id: "IAM-001",
    name: "Separation of duties: code and production",
    description:
      "The same actor commits code and changes production inside the window without another person approving the deploy.",
    domain: "access",
    severity: "high",
    tier: 1,
    kind: "event",
    dossier: "soc2_deficiency",
  },
  defaultParams,
  kind: "event",

  evaluate(ctx: RuleContext, overrides?: Partial<IamParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const results: RuleResult[] = [];
    for (const pair of pairs) {
      const actors = new Set(
        ctx.events
          .filter((event) => event.action === pair.first || event.action === pair.second)
          .map((event) => event.actor.id),
      );
      for (const actorId of actors) {
        const own = ctx.events
          .filter((event) => event.actor.id === actorId)
          .sort((left, right) =>
            left.timestamp < right.timestamp ? -1 : left.timestamp > right.timestamp ? 1 : 0,
          );
        const firsts = own.filter((event) => event.action === pair.first);
        const seconds = own.filter((event) => event.action === pair.second);
        if (firsts.length === 0 || seconds.length === 0) continue;
        const subject = { id: actorId, name: own[0].actor.name };

        let violation: { first: (typeof own)[number]; second: (typeof own)[number] } | null = null;
        for (const second of seconds) {
          const approver = second.context.approvedBy;
          const hasDistinctApprover = typeof approver === "string" && approver !== actorId;
          if (hasDistinctApprover) continue;
          const windowStart = Date.parse(second.timestamp) - params.windowHours * 3_600_000;
          const priorFirst = firsts.find(
            (first) =>
              Date.parse(first.timestamp) <= Date.parse(second.timestamp) &&
              Date.parse(first.timestamp) >= windowStart,
          );
          if (priorFirst) {
            violation = { first: priorFirst, second };
            break;
          }
        }

        const parameters = { windowHours: params.windowHours };
        results.push({
          ruleId: "IAM-001",
          ruleVersion: "1",
          verdict: violation ? "fail" : "pass",
          subject,
          triggeringRefs: violation
            ? [
                { type: "event" as const, id: violation.first.id },
                { type: "event" as const, id: violation.second.id },
              ]
            : [],
          observed: violation
            ? {
                actorName: subject.name,
                hoursApart: hoursBetween(violation.first.timestamp, violation.second.timestamp),
                commitRef: violation.first.resource.label ?? violation.first.resource.id,
                deployRef: violation.second.resource.label ?? violation.second.resource.id,
              }
            : { actorName: subject.name },
          parameters,
        });
      }
    }
    return results;
  },

  riskFactors() {
    return [];
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    if (observed.hoursApart === undefined) {
      return `${String(observed.actorName)} had no unapproved commit-and-deploy pair inside the ${String(result.parameters.windowHours)}-hour window.`;
    }
    return `${String(observed.actorName)} committed code (${String(observed.commitRef)}) and deployed to production (${String(observed.deployRef)}) ${String(observed.hoursApart)} hours apart without a second approver.`;
  },
};
