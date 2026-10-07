import { z } from "zod";
import { IsoUtcMs } from "./common";

export const LEDGER_EVENT_TYPES = [
  "CHECK_RUN",
  "EVIDENCE_RECORDED",
  "ALERT_TRIGGERED",
  "ALERT_AUTO_RESOLVED",
  "DRAFT_GENERATED",
  "OBLIGATION_CONFIRMED",
  "OBLIGATION_COMPLETED",
  "RULE_CONNECTED",
  "OFFICER_REVIEWED",
  "OVERRIDE_RECORDED",
  "REPORT_FILED",
  "ALERT_DISMISSED",
  "ALERT_ESCALATED",
  "RESPONSE_EXECUTED",
  "RESPONSE_REVERSED",
  "AUDIT_PACK_EXPORTED",
] as const;

export const LedgerEventType = z.enum(LEDGER_EVENT_TYPES);

/** Append-only audit block; hashes are recomputed by the verifier, never trusted. */
export const AuditBlock = z.object({
  blockIndex: z.number().int().nonnegative(),
  timestamp: IsoUtcMs,
  eventType: LedgerEventType,
  actor: z.string().min(1),
  alertId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  payloadHash: z.string().regex(/^[0-9a-f]{64}$/),
  previousHash: z.string().regex(/^[0-9a-f]{64}$/),
  currentHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export type LedgerEventType = z.infer<typeof LedgerEventType>;
export type AuditBlock = z.infer<typeof AuditBlock>;
