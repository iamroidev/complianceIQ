import { z } from "zod";
import { EvidenceRef, ExtractedObligation } from "../types";

/**
 * The shape a model (or a fixture file) must return before ids and origins
 * are attached — every AI path produces this, gets validated, then wrapped.
 */
export const RawParagraph = z.object({
  heading: z.string().min(1).optional(),
  text: z.string().min(1),
  citations: z.array(z.string()),
  evidenceRefs: z.array(EvidenceRef),
});

export const RawOutput = z.object({
  paragraphs: z.array(RawParagraph).min(1),
});

/** §7.4 C — proposed obligations; documentId and generatedBy added by the wrapper. */
export const RawExtracted = z.object({
  obligations: z.array(ExtractedObligation),
});

/** §7.4 E — the AI-authored part of a gap suggestion; the wrapper adds ids. */
export const RawGapSuggestion = z.object({
  text: z.string().min(1),
  citedQuote: z.string().min(1),
  suggestedCheck: z.string().min(1),
});

/** §7.4 F — ranked list; the wrapper assigns ranks 1..n in array order. */
export const RawPriorityOrder = z.object({
  order: z.array(
    z.object({
      alertId: z.string().min(1),
      reason: z.string().min(1),
      citedFacts: z.array(z.string()),
    }),
  ),
});

export type RawParagraph = z.infer<typeof RawParagraph>;
export type RawOutput = z.infer<typeof RawOutput>;
export type RawExtracted = z.infer<typeof RawExtracted>;
export type RawGapSuggestion = z.infer<typeof RawGapSuggestion>;
export type RawPriorityOrder = z.infer<typeof RawPriorityOrder>;
