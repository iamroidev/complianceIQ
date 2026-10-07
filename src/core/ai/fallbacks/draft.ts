import type { Alert, DossierKind } from "../../types";
import type { AnyRuleModule } from "../../engine/types";
import { DOSSIER_OUTLINES } from "../outlines";
import type { ValidatableParagraph } from "../validators";
import { formatShort } from "@/lib/format";

const POLICY_HEADINGS = new Set([
  "Finding",
  "Requirement",
  "Control",
  "Deviation from baseline",
  "Policy breach",
  "Found",
]);

const EVIDENCE_HEADINGS = new Set(["Evidence attached", "Finding", "Found"]);

function sectionText(
  heading: string,
  alert: Alert,
  rule: AnyRuleModule,
  riskSentence: string,
): string {
  switch (heading) {
    case "Subject":
      return `${alert.subject.name} (${alert.subject.id}) in the ${alert.domain} domain.`;
    case "Chronology":
      return `${alert.summarySentence} First recorded at ${alert.createdAt}.`;
    case "Evidence attached":
      return `Snapshot ${alert.snapshotEvidenceIds.join(", ")} holds the register rows behind this finding.`;
    case "Recommendation":
      return `Review this ${alert.severity} draft before any submission; the response is due by ${formatShort(alert.slaDueAt)}.`;
    case "Impact":
    case "Exposure":
      return `${riskSentence}`;
    case "Compensating controls":
      return "Record any compensating control and its evidence during review.";
    case "Remediation plan":
      return "Record the remediation steps and the evidence that shows them complete.";
    case "Who accessed":
      return `${alert.subject.name} (${alert.subject.id}).`;
    case "Nature of information":
      return `${alert.summarySentence}`;
    case "Mitigation":
      return "Record the mitigation taken and its evidence during review.";
    case "Likelihood of compromise":
      return "Assess during review. This finding records the access facts, not a conclusion.";
    case "Expense and category":
      return `${alert.summarySentence}`;
    case "Manager justification needed":
      return "Record the manager justification and its evidence during review.";
    case "Fix":
      return "Remove the issue, record the fix, and attach the evidence to this case.";
    case "Prevention":
      return "Record the preventive control and the evidence that shows it in place.";
    case "Corrective action":
      return "Record the corrective steps and the evidence that completes them, then close this finding with a reason.";
    case "Owner and due date":
      return `Owner not yet assigned. Review due by ${formatShort(alert.slaDueAt)}.`;
    case "Requirement":
    case "Control":
    case "Deviation from baseline":
    case "Policy breach":
    case "Found":
    case "Finding":
      return rule.meta.description;
    default:
      return `${alert.summarySentence}`;
  }
}

/**
 * Deterministic draft fallback (§7.4 B): one template paragraph per outline
 * heading, built only from alert facts and the rule description.
 */
export function fallbackDraftParagraphs(
  alert: Alert,
  rule: AnyRuleModule,
  kind: DossierKind,
): ValidatableParagraph[] {
  const outline = DOSSIER_OUTLINES[kind];
  const riskReasons = alert.riskReasons.length > 0 ? ` ${alert.riskReasons.join("; ")}.` : "";
  const riskSentence = `Risk score ${alert.riskScore} with severity ${alert.severity}.${riskReasons} Review due by ${formatShort(alert.slaDueAt)}.`;
  const citations = alert.policyRefs.slice(0, 2).map((ref) => ref.chunkId);
  const snapshotRefs = alert.snapshotEvidenceIds.map((id) => ({ type: "evidence" as const, id }));

  return outline.map((heading) => ({
    heading,
    text: sectionText(heading, alert, rule, riskSentence),
    citations: POLICY_HEADINGS.has(heading) ? citations : [],
    evidenceRefs: EVIDENCE_HEADINGS.has(heading) ? snapshotRefs : [],
  }));
}
