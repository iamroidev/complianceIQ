import { z } from "zod";
import { EvidenceRef, IsoUtcMs } from "./common";
import { ObligationCadence, ObligationKind } from "./policy";

/** Every stored AI output carries provenance and passes a validator before display. */
export const GeneratedBy = z.enum(["kimi", "fixture", "template"]);

/** §7.4 F / MASTER line 254 — the suggested order's fallback is the score order itself. */
export const PriorityGeneratedBy = z.enum(["kimi", "fixture", "score-order"]);

export const Paragraph = z.object({
  id: z.string().min(1),
  heading: z.string().optional(),
  text: z.string().min(1),
  citations: z.array(z.string()),
  evidenceRefs: z.array(EvidenceRef),
  origin: z.enum(["ai", "template", "edited"]),
});

export const DossierKind = z.enum([
  "sar",
  "soc2_deficiency",
  "hipaa_4factor",
  "te_disallowance",
  "secure_sdlc_finding",
  "exception_memo",
]);

export const Explanation = z.object({
  id: z.string().min(1),
  alertId: z.string().min(1),
  paragraphs: z.array(Paragraph),
  generatedBy: GeneratedBy,
});

export const Draft = z.object({
  id: z.string().min(1),
  alertId: z.string().min(1),
  kind: DossierKind,
  paragraphs: z.array(Paragraph),
  generatedBy: GeneratedBy,
  createdAt: IsoUtcMs,
});

/** One proposed obligation from §7.4 C — the quote is copied from the document. */
export const ExtractedObligation = z.object({
  title: z.string().min(1),
  kind: ObligationKind,
  cadence: ObligationCadence.optional(),
  quote: z.string().min(1),
  suggestedRuleId: z.string().optional(),
});

export const ExtractionResult = z.object({
  documentId: z.string().min(1),
  obligations: z.array(ExtractedObligation),
  generatedBy: GeneratedBy,
});

/** Advisory only — a suggestion never counts as a confirmed gap. */
export const GapSuggestion = z.object({
  id: z.string().min(1),
  obligationId: z.string().optional(),
  documentId: z.string().min(1),
  text: z.string().min(1),
  citedQuote: z.string().min(1),
  suggestedCheck: z.string().min(1),
  generatedBy: GeneratedBy,
});

export const PrioritySuggestion = z.object({
  id: z.string().min(1),
  generatedAt: IsoUtcMs,
  order: z.array(
    z.object({
      alertId: z.string().min(1),
      rank: z.number().int().positive(),
      reason: z.string().min(1),
      citedFacts: z.array(z.string()),
    }),
  ),
  generatedBy: PriorityGeneratedBy,
});

export type GeneratedBy = z.infer<typeof GeneratedBy>;
export type PriorityGeneratedBy = z.infer<typeof PriorityGeneratedBy>;
export type Paragraph = z.infer<typeof Paragraph>;
export type DossierKind = z.infer<typeof DossierKind>;
export type Explanation = z.infer<typeof Explanation>;
export type Draft = z.infer<typeof Draft>;
export type ExtractedObligation = z.infer<typeof ExtractedObligation>;
export type ExtractionResult = z.infer<typeof ExtractionResult>;
export type GapSuggestion = z.infer<typeof GapSuggestion>;
export type PrioritySuggestion = z.infer<typeof PrioritySuggestion>;
