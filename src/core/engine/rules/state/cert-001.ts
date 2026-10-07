import type { Certification, Person, RuleContext, RuleResult, Severity } from "../../../types";
import type { RiskInput, RuleModule, TriggeredRiskFactor } from "../../types";
import { addDays, daysBetween, formatUtcDate, utcDay } from "../../format";

type CertParams = {
  graceDays: number;
}

const defaultParams: CertParams = { graceDays: 0 };

function requirementMatches(person: Person, appliesTo: { role?: string; department?: string }): boolean {
  const roleOk = appliesTo.role === undefined || appliesTo.role === person.role;
  const departmentOk =
    appliesTo.department === undefined || appliesTo.department === person.department;
  return roleOk && departmentOk;
}

function isStillValid(certification: Certification, asOfDay: string, graceDays: number): boolean {
  if (!certification.expiresOn) return true;
  return asOfDay <= addDays(certification.expiresOn, graceDays);
}

export const cert001: RuleModule<CertParams> = {
  meta: {
    id: "CERT-001",
    name: "Required certification missing or expired",
    description:
      "An active person whose role requires a certification has no valid one at asOf (expiry day itself is still valid).",
    domain: "people",
    severity: "high",
    tier: 1,
    kind: "state",
    dossier: "exception_memo",
  },
  defaultParams,
  kind: "state",

  evaluate(ctx: RuleContext, overrides?: Partial<CertParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const asOfDay = utcDay(ctx.asOf);
    const results: RuleResult[] = [];
    const active = ctx.registers.people.filter((person) => person.status === "active");
    for (const person of active) {
      const requirements = ctx.registers.requirements.filter((requirement) =>
        requirementMatches(person, requirement.appliesTo),
      );
      for (const requirement of requirements) {
        const held = ctx.registers.certifications.filter(
          (certification) =>
            certification.personId === person.id &&
            certification.type === requirement.certType &&
            isStillValid(certification, asOfDay, params.graceDays),
        );
        const parameters = { graceDays: params.graceDays };
        const common = {
          ruleId: "CERT-001",
          ruleVersion: "1",
          subject: { id: person.id, name: person.name },
          parameters,
        };
        if (held.length > 0) {
          results.push({
            ...common,
            verdict: "pass",
            triggeringRefs: [],
            observed: {
              personName: person.name,
              certType: requirement.certType,
              criticality: requirement.criticality,
            },
          });
          continue;
        }
        const latestExpiry = ctx.registers.certifications
          .filter(
            (certification) =>
              certification.personId === person.id && certification.type === requirement.certType,
          )
          .map((certification) => certification.expiresOn)
          .filter((day): day is string => day !== undefined)
          .sort((left, right) => (left < right ? 1 : left > right ? -1 : 0))[0];
        results.push({
          ...common,
          verdict: "fail",
          triggeringRefs: [],
          observed: {
            personName: person.name,
            certType: requirement.certType,
            criticality: requirement.criticality,
            expiresOn: latestExpiry ?? "none",
            daysExpired: latestExpiry ? daysBetween(latestExpiry, asOfDay) : 0,
          },
        });
      }
    }
    return results;
  },

  riskFactors({ result, ctx }: RiskInput<CertParams>): TriggeredRiskFactor[] {
    const factors: TriggeredRiskFactor[] = [];
    if (result.observed.criticality === "high") {
      factors.push({ points: 15, reason: "The role requires a high-criticality certification" });
    }
    const daysExpired = Number(result.observed.daysExpired ?? 0);
    if (daysExpired > 0) {
      const points = Math.min(30, Math.floor(daysExpired / 30) * 10);
      if (points > 0) {
        factors.push({ points, reason: `Certification overdue by ${daysExpired} days` });
      }
    }
    const privileged = ctx.registers.accounts.some(
      (account) => account.personId === result.subject.id && account.privileged,
    );
    if (privileged) {
      factors.push({ points: 10, reason: "The person holds privileged access" });
    }
    return factors;
  },

  severityFor(result: RuleResult): Severity {
    return result.observed.criticality === "high" ? "high" : "medium";
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    const name = String(observed.personName);
    const certType = String(observed.certType);
    if (result.verdict === "pass") {
      return `${name}'s ${certType} certificate is valid. The role requires it.`;
    }
    if (observed.expiresOn === "none") {
      return `${name} has no ${certType} certificate on file. The role requires it.`;
    }
    const days = Number(observed.daysExpired);
    if (days <= 0) {
      return `${name}'s ${certType} certificate expires on ${formatUtcDate(String(observed.expiresOn))}. The role requires it.`;
    }
    return `${name}'s ${certType} certificate expired on ${formatUtcDate(String(observed.expiresOn))}, ${days} day${days === 1 ? "" : "s"} ago. The role requires it.`;
  },
};
