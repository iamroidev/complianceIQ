import type { EvidenceItem } from "@/core/types";

/** Evidence kind words for UI (MASTER §7.5; "Check run" is never shown). */
export const EVIDENCE_KIND_LABELS: Record<EvidenceItem["kind"], string> = {
  record_snapshot: "Record snapshot",
  event_set: "Event set",
  document: "Document",
  check_run: "Checks completed",
  decision: "Decision",
  ci_log: "CI log",
  agent_batch: "Agent batch",
};
