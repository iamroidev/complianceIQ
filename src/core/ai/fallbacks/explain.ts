import type { Alert } from "../../types";
import type { AnyRuleModule } from "../../engine/types";
import type { ValidatableParagraph } from "../validators";
import { formatShort } from "@/lib/format";

/**
 * Deterministic explain fallback (§7.4 A): a template built from
 * `summarize()` — the alert's own summary sentence — and the rule's
 * description. Uses only facts already on the alert, so it always passes
 * the validator.
 */
export function fallbackExplainParagraphs(
  alert: Alert,
  rule: AnyRuleModule,
): ValidatableParagraph[] {
  const riskReasons =
    alert.riskReasons.length > 0 ? ` Risk factors: ${alert.riskReasons.join("; ")}.` : "";
  const citations = alert.policyRefs.slice(0, 2).map((ref) => ref.chunkId);
  const snapshotRefs = alert.snapshotEvidenceIds.map((id) => ({ type: "evidence" as const, id }));
  return [
    {
      heading: "Why this was flagged",
      text: `${alert.summarySentence}${riskReasons}`,
      citations,
      evidenceRefs: snapshotRefs,
    },
    {
      heading: "Why it matters",
      text: `${rule.meta.description} This ${alert.severity} finding is due for review by ${formatShort(alert.slaDueAt)}.`,
      citations,
      evidenceRefs: [],
    },
  ];
}
