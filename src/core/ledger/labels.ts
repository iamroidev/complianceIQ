import type { LedgerEventType } from "../types";

/** UI names for event types live here only — components never print raw enums. */
export const LEDGER_EVENT_LABELS: Record<LedgerEventType, string> = {
  CHECK_RUN: "Checks run",
  EVIDENCE_RECORDED: "Evidence recorded",
  ALERT_TRIGGERED: "Alert opened",
  ALERT_AUTO_RESOLVED: "Alert closed automatically",
  DRAFT_GENERATED: "Draft generated",
  OBLIGATION_CONFIRMED: "Obligation confirmed",
  OBLIGATION_COMPLETED: "Obligation marked complete",
  RULE_CONNECTED: "Rule connected to obligation",
  OFFICER_REVIEWED: "Officer reviewed",
  OVERRIDE_RECORDED: "Override recorded",
  REPORT_FILED: "Report filed",
  ALERT_DISMISSED: "Alert dismissed",
  ALERT_ESCALATED: "Alert escalated",
  RESPONSE_EXECUTED: "Response executed",
  RESPONSE_REVERSED: "Response reversed",
  AUDIT_PACK_EXPORTED: "Audit pack exported",
};

export function ledgerEventLabel(eventType: LedgerEventType): string {
  return LEDGER_EVENT_LABELS[eventType];
}
