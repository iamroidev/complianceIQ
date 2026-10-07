import type { RuleContext, RuleResult } from "../../../types";
import type { RuleModule } from "../../types";
import { shannonEntropy } from "../../entropy";
import secrets from "../../../../data/rules/secrets.json";

type DevParams = {
  entropyThreshold: number;
}

const defaultParams: DevParams = { entropyThreshold: secrets.entropyThreshold };

interface SecretProvider {
  name: string;
  pattern: string;
}

const providers: SecretProvider[] = secrets.providers;

interface Finding {
  provider: string;
  secret: string;
  entropy: number;
}

function findSecrets(text: string, threshold: number): Finding[] {
  const findings: Finding[] = [];
  for (const provider of providers) {
    const pattern = new RegExp(provider.pattern, "g");
    for (const match of text.matchAll(pattern)) {
      const secret = match[1] ?? match[0];
      const entropy = shannonEntropy(secret);
      if (entropy >= threshold) {
        findings.push({ provider: provider.name, secret, entropy });
        break;
      }
    }
  }
  return findings;
}

export const dev001: RuleModule<DevParams> = {
  meta: {
    id: "DEV-001",
    name: "Hardcoded secret in a commit",
    description:
      "A commit's scanned text contains a provider-matching secret whose Shannon entropy is at or above the threshold.",
    domain: "code",
    severity: "critical",
    tier: 1,
    kind: "event",
    dossier: "secure_sdlc_finding",
  },
  defaultParams,
  kind: "event",

  evaluate(ctx: RuleContext, overrides?: Partial<DevParams>): RuleResult[] {
    const params = { ...defaultParams, ...overrides };
    const results: RuleResult[] = [];
    for (const event of ctx.events) {
      if (event.action !== "commit_code") continue;
      const scanned = event.context.scannedText;
      if (typeof scanned !== "string") continue;
      const finding = findSecrets(scanned, params.entropyThreshold)[0] ?? null;
      const subject = {
        id: event.resource.id,
        name: event.resource.label ?? event.resource.id,
      };
      results.push({
        ruleId: "DEV-001",
        ruleVersion: "1",
        verdict: finding ? "fail" : "pass",
        subject,
        triggeringRefs: finding ? [{ type: "event" as const, id: event.id }] : [],
        observed: finding
          ? {
              commitRef: event.resource.label ?? event.resource.id,
              provider: finding.provider,
              entropy: Math.round(finding.entropy * 10) / 10,
            }
          : { commitRef: subject.name },
        parameters: { entropyThreshold: params.entropyThreshold },
      });
    }
    return results;
  },

  riskFactors() {
    return [];
  },

  summarize(result: RuleResult): string {
    const observed = result.observed;
    if (observed.provider === undefined) {
      return `No hardcoded secret found in commit ${String(observed.commitRef)}.`;
    }
    return `Commit ${String(observed.commitRef)} contains a hardcoded ${String(observed.provider)} with entropy ${String(observed.entropy)}, above the ${String(result.parameters.entropyThreshold)} threshold.`;
  },
};
