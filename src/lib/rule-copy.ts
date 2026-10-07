import type { RuleKind } from "@/core/engine/types";
import type { ScenarioStep } from "@/core/pipeline/scenarios";
import type { Domain, Registers, Severity } from "@/core/types";

/**
 * Plain-English copy for the Rules screen (DESIGN §7: "two simple lists with
 * search; rule detail shows plain description first, parameters second, 'Try
 * it on a sample' third"). The rule modules stay the single source of truth
 * for behaviour; these sentences are the wording a first-year analyst reads.
 */

export interface SampleStepLabel {
  kind: string;
  label: string;
}

export interface SampleCard {
  scenarioId: string;
  title: string;
  note: string;
  steps: SampleStepLabel[];
}

export interface RuleCard {
  id: string;
  name: string;
  plainDescription: string;
  description: string;
  domain: Domain;
  severity: Severity;
  kind: RuleKind;
  dossier: string;
  defaultParams: Record<string, unknown>;
  sample: SampleCard | null;
  control: SampleCard | null;
}

export const PLAIN_RULE_DESCRIPTIONS: Record<string, string> = {
  "AML-001":
    "One person makes at least two cash deposits that each sit just under the reporting limit, together above it, within two days.",
  "FIN-001":
    "A payment of USD 5,000 or more goes out without someone other than the requester approving it, or a payment of USD 25,000 or more goes out on a single approval.",
  "IAM-001":
    "The same person writes code and then changes production inside a day, with nobody else approving the release.",
  "HIPAA-001":
    "Someone outside the patient's care team opens a record that is marked restricted.",
  "DEV-001":
    "A commit carries a password or key that looks real enough to work, not a placeholder.",
  "CERT-001":
    "Someone still employed holds a job that requires a certificate, and no valid one is on file for them today.",
  "DEAD-001":
    "A confirmed obligation with no recorded completion has passed its due date, or is close enough to warn about.",
  "VEND-001":
    "A supplier is missing a document the company requires for its tier, or the one on file has expired.",
};

export const PARAM_LABELS: Record<string, string> = {
  "AML-001.bandMin": "Just-under-limit band starts at (USD)",
  "AML-001.bandMax": "Just-under-limit band ends at (USD)",
  "AML-001.windowHours": "Rolling window (hours)",
  "AML-001.minCount": "Deposits needed to fire",
  "AML-001.limit": "Reporting limit (USD)",
  "FIN-001.thresholdLow": "First approval required from (USD)",
  "FIN-001.approversLow": "Approvers needed at that level",
  "FIN-001.thresholdHigh": "Two approvers required from (USD)",
  "IAM-001.windowHours": "Window between the two actions (hours)",
  "HIPAA-001.restrictedFlag": "Records marked",
  "DEV-001.entropyThreshold": "Secret strength threshold",
  "CERT-001.graceDays": "Extra days allowed after expiry",
  "DEAD-001.warningDays": "Warn this many days before the due date",
  "VEND-001.criticalRequired": "Documents a critical supplier needs",
  "VEND-001.standardRequired": "Documents a standard supplier needs",
};

export function plainDescription(ruleId: string, technical: string): string {
  return PLAIN_RULE_DESCRIPTIONS[ruleId] ?? technical;
}

export function paramLabel(ruleId: string, param: string): string {
  return PARAM_LABELS[`${ruleId}.${param}`] ?? param;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  soc2_report: "SOC 2 report",
  dpa: "Data processing agreement",
  insurance: "Insurance certificate",
  pen_test: "Penetration test report",
  contract: "Contract",
};

/** Reads a list parameter as plain words (the wire values stay unchanged). */
export function arrayParamToText(values: readonly unknown[]): string {
  return values
    .map((value) => (typeof value === "string" ? (DOCUMENT_TYPE_LABELS[value] ?? value) : String(value)))
    .join(", ");
}

/** Maps plain words back to the wire values a list parameter expects. */
export function textToArrayParam(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const hit = Object.entries(DOCUMENT_TYPE_LABELS).find(
        ([, label]) => label.toLowerCase() === part.toLowerCase(),
      );
      return hit ? hit[0] : part;
    });
}

function humanize(word: string): string {
  return word
    .split("_")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

/**
 * One plain sentence per sample step, used for the numbered strip above the
 * test result and for the "first fires at step N" wording.
 */
export function stepLabel(step: ScenarioStep, registers: Registers): string {
  switch (step.kind) {
    case "advanceDays":
      return `Move the date ${step.days} day${step.days === 1 ? "" : "s"} forward`;
    case "runChecks":
      return "Run the scheduled checks";
    case "completeObligation": {
      const obligation = registers.obligations.find((row) => row.id === step.obligationId);
      return `Record completion of ${obligation ? obligation.title : step.obligationId}`;
    }
    case "upsertCertification": {
      const person = registers.people.find((row) => row.id === step.personId);
      return `Give ${person ? person.name : step.personId} a ${step.certType} certificate valid to ${step.expiresOn}`;
    }
    case "upsertVendorDocument": {
      const vendor = registers.vendors.find((row) => row.id === step.vendorId);
      const kind = DOCUMENT_TYPE_LABELS[step.documentType] ?? humanize(step.documentType);
      return `Put a ${kind} on file for ${vendor ? vendor.name : step.vendorId}, valid to ${step.expiresOn}`;
    }
    case "event": {
      const event = step.event as {
        action?: string;
        actor?: { name?: string };
        context?: { amount?: number; currency?: string };
      };
      const action = event.action ? humanize(event.action) : "Record an event";
      const who = event.actor?.name ? ` by ${event.actor.name}` : "";
      const amount =
        typeof event.context?.amount === "number"
          ? ` of ${event.context.currency ?? "USD"} ${event.context.amount.toLocaleString("en-US")}`
          : "";
      return `Record ${action}${amount}${who}`;
    }
    default:
      return "Run this step";
  }
}
