import { z } from "zod";

export const PolicyDocument = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["internal_demo", "regulation_summary", "regulation_text"]),
  version: z.string().min(1),
  text: z.string(),
});

export const PolicyClause = z.object({
  chunkId: z.string().min(1),
  documentId: z.string().min(1),
  regulation: z.string().min(1),
  citation: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  textKind: z.enum(["verbatim", "summary"]),
  sourceUrl: z.string().url().optional(),
});

export const ObligationKind = z.enum([
  "recurring",
  "deadline",
  "threshold",
  "requirement",
  "prohibition",
]);

export const ObligationCadence = z.enum(["monthly", "quarterly", "annual", "once"]);

export const Obligation = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  plainDescription: z.string().min(1),
  kind: ObligationKind,
  source: z.object({
    documentId: z.string().min(1),
    chunkId: z.string().optional(),
    quote: z.string().min(1),
    quoteSpan: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  }),
  cadence: ObligationCadence.optional(),
  dueOn: z.string().optional(),
  lastCompletedOn: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(["proposed", "confirmed", "rejected"]),
  origin: z.enum(["manual", "ai_extracted"]),
  ruleIds: z.array(z.string()),
  evidenceRequired: z.array(z.string()).optional(),
});

export const CoverageItem = z.object({
  obligationId: z.string().min(1),
  status: z.enum(["covered", "partial", "gap"]),
  ruleIds: z.array(z.string()),
  lastPassedAt: z.string().optional(),
  reason: z.string().min(1),
});

export type PolicyDocument = z.infer<typeof PolicyDocument>;
export type PolicyClause = z.infer<typeof PolicyClause>;
export type Obligation = z.infer<typeof Obligation>;
export type ObligationKind = z.infer<typeof ObligationKind>;
export type ObligationCadence = z.infer<typeof ObligationCadence>;
export type CoverageItem = z.infer<typeof CoverageItem>;
