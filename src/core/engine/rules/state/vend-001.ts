import type { RuleContext, RuleResult, Severity } from "../../../types";
import type { RuleModule } from "../../types";
import { article, formatUtcDate, utcDay } from "../../format";

type VendorDocType = "soc2_report" | "dpa" | "insurance" | "pen_test" | "contract";

type VendParams = {
  criticalRequired: VendorDocType[];
  standardRequired: VendorDocType[];
}

const defaultParams: VendParams = {
  criticalRequired: ["soc2_report", "dpa", "insurance"],
  standardRequired: ["dpa"],
};

const DOC_LABELS: Record<VendorDocType, string> = {
  soc2_report: "SOC 2 report",
  dpa: "DPA",
  insurance: "insurance certificate",
  pen_test: "penetration test",
  contract: "contract",
};

export const vend001: RuleModule<VendParams> = {
  meta: {
    id: "VEND-001",
    name: "Vendor document missing or expired",
    description:
      "A vendor is missing or holds an expired document required for its tier (critical: SOC 2, DPA, insurance; standard: DPA).",
    domain: "vendor",
    severity: "high",
    tier: 1,
    kind: "state",
    dossier: "exception_memo",
  },
  defaultParams,
  kind: "state",

  evaluate(ctx: RuleContext, overrides?: Partial<VendParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const asOfDay = utcDay(ctx.asOf);
    const results: RuleResult[] = [];
    for (const vendor of ctx.registers.vendors) {
      const required =
        vendor.tier === "critical" ? params.criticalRequired : params.standardRequired;
      let failure: { docType: VendorDocType; state: "missing" | "expired"; expiresOn: string } | null =
        null;
      for (const docType of required) {
        const held = vendor.documents.filter((document) => document.type === docType);
        if (held.length === 0) {
          failure = { docType, state: "missing", expiresOn: "none" };
          break;
        }
        const stillValid = held.some(
          (document) => !document.expiresOn || utcDay(document.expiresOn) >= asOfDay,
        );
        if (!stillValid) {
          const latest = held
            .map((document) => document.expiresOn)
            .filter((day): day is string => day !== undefined)
            .sort((left, right) => (left < right ? 1 : left > right ? -1 : 0))[0];
          failure = { docType, state: "expired", expiresOn: latest ?? "none" };
          break;
        }
      }
      const parameters = {
        tier: vendor.tier,
        requiredDocs: required.join(", "),
      };
      const common = {
        ruleId: "VEND-001",
        ruleVersion: "1",
        subject: { id: vendor.id, name: vendor.name },
        parameters,
      };
      results.push({
        ...common,
        verdict: failure ? "fail" : "pass",
        triggeringRefs: failure ? [{ type: "record" as const, id: vendor.id }] : [],
        observed: failure
          ? {
              vendorName: vendor.name,
              tier: vendor.tier,
              docType: failure.docType,
              state: failure.state,
              expiresOn: failure.expiresOn,
            }
          : { vendorName: vendor.name, tier: vendor.tier },
      });
    }
    return results;
  },

  riskFactors() {
    return [];
  },

  severityFor(result: RuleResult): Severity {
    return result.observed.tier === "critical" ? "high" : "medium";
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    const vendorName = String(observed.vendorName);
    const tierWord = observed.tier === "critical" ? "Critical" : "Standard";
    if (observed.state === undefined) {
      return `${vendorName} holds every document required for the ${tierWord} tier.`;
    }
    const label = DOC_LABELS[observed.docType as VendorDocType];
    const requirement = `${tierWord}-tier vendors must hold ${article(label)} current ${label}.`;
    if (observed.state === "missing") {
      return `${vendorName} is missing ${article(label)} required ${label}. ${requirement}`;
    }
    return `${vendorName}'s ${label} expired on ${formatUtcDate(String(observed.expiresOn))}. ${requirement}`;
  },
};
