import type { RuleContext, RuleResult } from "../../../types";
import type { RuleModule } from "../../types";

type HipaaParams = {
  restrictedFlag: string;
}

const defaultParams: HipaaParams = { restrictedFlag: "restricted" };

export const hipaa001: RuleModule<HipaaParams> = {
  meta: {
    id: "HIPAA-001",
    name: "Restricted record viewed outside the care team",
    description:
      "A restricted patient record was viewed by someone who is not on the record's care team.",
    domain: "healthcare",
    severity: "high",
    tier: 1,
    kind: "event",
    dossier: "hipaa_4factor",
  },
  defaultParams,
  kind: "event",

  evaluate(ctx: RuleContext, overrides?: Partial<HipaaParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const results: RuleResult[] = [];
    for (const event of ctx.events) {
      if (event.action !== "view_record") continue;
      const attributes = event.resource.attributes ?? {};
      const restricted = attributes[params.restrictedFlag] === true;
      const careTeamRaw = attributes.careTeam ?? event.context.careTeam;
      const careTeam = Array.isArray(careTeamRaw)
        ? careTeamRaw.filter((id): id is string => typeof id === "string")
        : [];
      const onCareTeam = careTeam.includes(event.actor.id);
      const fails = restricted && !onCareTeam;
      results.push({
        ruleId: "HIPAA-001",
        ruleVersion: "1",
        verdict: fails ? "fail" : "pass",
        subject: { id: event.actor.id, name: event.actor.name },
        triggeringRefs: fails ? [{ type: "event" as const, id: event.id }] : [],
        observed: {
          viewerName: event.actor.name,
          recordLabel: event.resource.label ?? event.resource.id,
          restricted,
          onCareTeam,
        },
        parameters: { restrictedFlag: params.restrictedFlag },
      });
    }
    return results;
  },

  riskFactors() {
    return [];
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    const viewer = String(observed.viewerName);
    const record = String(observed.recordLabel);
    if (observed.restricted !== true) {
      return `${viewer} viewed ${record}, which is not marked restricted.`;
    }
    if (observed.onCareTeam === true) {
      return `${viewer} is on the care team for ${record}.`;
    }
    return `${viewer} viewed the restricted record ${record} and is not on the care team.`;
  },
};
