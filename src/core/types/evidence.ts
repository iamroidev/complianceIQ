import { z } from "zod";
import { EvidenceRef, IsoUtcMs } from "./common";

export const EvidenceItem = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "record_snapshot",
    "event_set",
    "document",
    "check_run",
    "decision",
    "ci_log",
    "agent_batch",
  ]),
  title: z.string().min(1),
  source: z.string().min(1),
  collectedAt: IsoUtcMs,
  contentHash: z.string().regex(/^[0-9a-f]{64}$/, "expected lowercase sha256 hex"),
  content: z.unknown().optional(),
  contentRef: z.string().optional(),
  subjectRef: EvidenceRef.optional(),
  ledgerBlockIndex: z.number().int().nonnegative(),
});

export const CheckRun = z.object({
  id: z.string().min(1),
  asOf: IsoUtcMs,
  rulesRun: z.number().int().nonnegative(),
  subjectsChecked: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  ledgerBlockIndex: z.number().int().nonnegative(),
});

export type EvidenceItem = z.infer<typeof EvidenceItem>;
export type CheckRun = z.infer<typeof CheckRun>;
