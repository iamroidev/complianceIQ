import { z } from "zod";

/** ISO-8601 UTC with milliseconds — the only timestamp format in the product. */
export const ISO_UTC_MS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const IsoUtcMs = z.string().regex(ISO_UTC_MS_PATTERN, "expected ISO-8601 UTC ms (2026-01-15T10:00:00.000Z)");

export const Domain = z.enum([
  "finance",
  "people",
  "vendor",
  "access",
  "identity",
  "healthcare",
  "expense",
  "code",
  "regulatory",
  "ai",
]);

export const Severity = z.enum(["critical", "high", "medium", "low"]);

export const EvidenceRef = z.object({
  type: z.enum(["event", "record", "evidence"]),
  id: z.string().min(1),
});

/** Values rules may observe or parameterise. */
export const ObservedValue = z.union([z.number(), z.string(), z.boolean()]);

export type Domain = z.infer<typeof Domain>;
export type Severity = z.infer<typeof Severity>;
export type EvidenceRef = z.infer<typeof EvidenceRef>;
export type ObservedValue = z.infer<typeof ObservedValue>;
export type IsoUtcMs = z.infer<typeof IsoUtcMs>;
