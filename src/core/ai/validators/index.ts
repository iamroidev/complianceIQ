import type { Alert, EvidenceRef, ExtractedObligation, Obligation } from "../../types";
import type { Corpus } from "../../rag/corpus";
import { validateCitations } from "../../rag/validate-citations";
import type { RawGapSuggestion, RawPriorityOrder } from "../raw";
import { checkFacts } from "./facts";
import { findForbiddenPhrases, hasLegalConclusion } from "./forbidden-claims";
import { isFactInFacts, isQuoteInDocument } from "./quotes";

export type AiIssueCode =
  | "alert_mismatch"
  | "forbidden_phrase"
  | "legal_conclusion"
  | "fabricated_chunk_id"
  | "unknown_evidence_ref"
  | "fabricated_number"
  | "fabricated_name"
  | "missing_citation"
  | "outline_mismatch"
  | "invalid_output"
  | "missing_quote"
  | "unknown_rule_id"
  | "unknown_alert_id"
  | "incomplete_order"
  | "unknown_fact";

export interface AiIssue {
  code: AiIssueCode;
  message: string;
  paragraphId?: string;
}

export interface ValidatableParagraph {
  id?: string;
  heading?: string;
  text: string;
  citations: string[];
  evidenceRefs: EvidenceRef[];
}

export interface AiValidationContext {
  alert: Alert;
  corpus: Corpus;
  factsText: string;
  requireCitations?: boolean;
}

/**
 * The M5 validator suite (§7.4, §11): forbidden phrases anywhere, legal
 * conclusions only with a citation, every chunk id present in the corpus,
 * every evidence ref owned by the alert, and every number/name present in
 * the supplied facts.
 */
export function validateParagraphs(
  paragraphs: readonly ValidatableParagraph[],
  ctx: AiValidationContext,
): AiIssue[] {
  const issues: AiIssue[] = [];
  const allowedEvidence = new Set<string>([
    ...ctx.alert.evidenceRefs.map((ref) => ref.id),
    ...ctx.alert.snapshotEvidenceIds,
  ]);

  paragraphs.forEach((paragraph, index) => {
    const id = paragraph.id ?? `#${index + 1}`;
    const full = paragraph.heading ? `${paragraph.heading}. ${paragraph.text}` : paragraph.text;

    for (const phrase of findForbiddenPhrases(full)) {
      issues.push({
        code: "forbidden_phrase",
        paragraphId: id,
        message: `Forbidden phrase "${phrase}".`,
      });
    }
    if (hasLegalConclusion(paragraph.text) && paragraph.citations.length === 0) {
      issues.push({
        code: "legal_conclusion",
        paragraphId: id,
        message: "Legal conclusion without a citation.",
      });
    }
    const { unknown } = validateCitations(paragraph.citations, ctx.corpus);
    for (const chunkId of unknown) {
      issues.push({
        code: "fabricated_chunk_id",
        paragraphId: id,
        message: `Unknown policy chunk "${chunkId}".`,
      });
    }
    for (const ref of paragraph.evidenceRefs) {
      if (!allowedEvidence.has(ref.id)) {
        issues.push({
          code: "unknown_evidence_ref",
          paragraphId: id,
          message: `Evidence ref "${ref.id}" is not part of this alert.`,
        });
      }
    }
    const facts = checkFacts(paragraph.text, ctx.factsText);
    for (const number of facts.fabricatedNumbers) {
      issues.push({
        code: "fabricated_number",
        paragraphId: id,
        message: `Number ${number} is not in the supplied facts.`,
      });
    }
    for (const name of facts.fabricatedNames) {
      issues.push({
        code: "fabricated_name",
        paragraphId: id,
        message: `Name "${name}" is not in the supplied facts.`,
      });
    }
  });

  if (ctx.requireCitations && !paragraphs.some((paragraph) => paragraph.citations.length > 0)) {
    issues.push({
      code: "missing_citation",
      message: "Every explanation must cite at least one policy chunk.",
    });
  }
  return issues;
}

export function validateExplanation(
  explanation: { alertId: string; paragraphs: ValidatableParagraph[] },
  ctx: AiValidationContext,
): AiIssue[] {
  const issues: AiIssue[] = [];
  if (explanation.alertId !== ctx.alert.id) {
    issues.push({
      code: "alert_mismatch",
      message: `Explanation is for ${explanation.alertId}, expected ${ctx.alert.id}.`,
    });
  }
  return [...issues, ...validateParagraphs(explanation.paragraphs, ctx)];
}

/** Drafts must follow the dossier outline exactly, in order (§7.3 B). */
export function validateOutline(
  paragraphs: readonly ValidatableParagraph[],
  outline: readonly string[],
): AiIssue[] {
  const headings = paragraphs.map((paragraph) => paragraph.heading ?? "");
  if (headings.length !== outline.length || headings.some((h, i) => h !== outline[i])) {
    return [
      {
        code: "outline_mismatch",
        message: `Expected outline [${outline.join(" | ")}], got [${headings.join(" | ")}].`,
      },
    ];
  }
  return [];
}

/** Rule ids look like CERT-001 / HIPAA-001 — used to police AI prose. */
const RULE_ID_TOKEN = /\b[A-Z]{2,6}-\d{3}\b/g;

export function findRuleIdTokens(text: string): string[] {
  return [...new Set(text.match(RULE_ID_TOKEN) ?? [])];
}

/**
 * Checks AI-authored prose that carries no citations: forbidden phrases, any
 * legal conclusion (nothing to cite against), and facts from the supplied
 * block. Verbatim quotes are never passed through this — they are document
 * text, not assertions.
 */
function uncitedProseIssues(text: string, paragraphId: string, factsText: string): AiIssue[] {
  const issues: AiIssue[] = [];
  for (const phrase of findForbiddenPhrases(text)) {
    issues.push({ code: "forbidden_phrase", paragraphId, message: `Forbidden phrase "${phrase}".` });
  }
  if (hasLegalConclusion(text)) {
    issues.push({ code: "legal_conclusion", paragraphId, message: "Legal conclusion without a citation." });
  }
  const facts = checkFacts(text, factsText);
  for (const number of facts.fabricatedNumbers) {
    issues.push({ code: "fabricated_number", paragraphId, message: `Number ${number} is not in the supplied facts.` });
  }
  for (const name of facts.fabricatedNames) {
    issues.push({ code: "fabricated_name", paragraphId, message: `Name "${name}" is not in the supplied facts.` });
  }
  return issues;
}

function unknownRuleIdIssues(text: string, knownRuleIds: ReadonlySet<string>, paragraphId: string): AiIssue[] {
  return findRuleIdTokens(text)
    .filter((id) => !knownRuleIds.has(id))
    .map((id) => ({
      code: "unknown_rule_id" as const,
      paragraphId,
      message: `Rule id "${id}" does not exist.`,
    }));
}

export interface ExtractionContext {
  documentText: string;
  knownRuleIds: ReadonlySet<string>;
}

/** §7.4 C: every quote copied from the document, titles factual, no invented rules. */
export function validateExtraction(
  obligations: readonly ExtractedObligation[],
  ctx: ExtractionContext,
): AiIssue[] {
  const issues: AiIssue[] = [];
  obligations.forEach((obligation, index) => {
    const id = `#${index + 1}`;
    if (!isQuoteInDocument(obligation.quote, ctx.documentText)) {
      issues.push({
        code: "missing_quote",
        paragraphId: id,
        message: "Quote is not a substring of the document.",
      });
    }
    issues.push(...uncitedProseIssues(obligation.title, id, ctx.documentText));
    if (obligation.suggestedRuleId !== undefined && !ctx.knownRuleIds.has(obligation.suggestedRuleId)) {
      issues.push({
        code: "unknown_rule_id",
        paragraphId: id,
        message: `Suggested rule id "${obligation.suggestedRuleId}" does not exist.`,
      });
    }
  });
  return issues;
}

export interface GapValidationContext {
  obligation: Obligation;
  documentText: string;
  factsText: string;
  knownRuleIds: ReadonlySet<string>;
}

/** §7.4 E: quote check as in C, prose factual, and only real rule ids. */
export function validateGapSuggestion(
  suggestion: RawGapSuggestion,
  ctx: GapValidationContext,
): AiIssue[] {
  const issues: AiIssue[] = [];
  if (!isQuoteInDocument(suggestion.citedQuote, ctx.documentText)) {
    issues.push({ code: "missing_quote", message: "Cited quote is not a substring of the document." });
  }
  issues.push(...uncitedProseIssues(suggestion.text, "text", ctx.factsText));
  issues.push(...uncitedProseIssues(suggestion.suggestedCheck, "suggestedCheck", ctx.factsText));
  issues.push(
    ...unknownRuleIdIssues(`${suggestion.text} ${suggestion.suggestedCheck}`, ctx.knownRuleIds, "text"),
  );
  return issues;
}

export interface PriorityValidationContext {
  alerts: readonly Alert[];
  factsText: string;
}

/** §7.4 F: every alert id exactly once, reasons factual, citedFacts present. */
export function validatePriorityOrder(
  order: RawPriorityOrder["order"],
  ctx: PriorityValidationContext,
): AiIssue[] {
  const issues: AiIssue[] = [];
  const known = new Set(ctx.alerts.map((alert) => alert.id));
  const seen = new Set<string>();

  for (const entry of order) {
    if (!known.has(entry.alertId)) {
      issues.push({
        code: "unknown_alert_id",
        paragraphId: entry.alertId,
        message: `Alert ${entry.alertId} is not part of the supplied alerts.`,
      });
    }
    if (seen.has(entry.alertId)) {
      issues.push({
        code: "incomplete_order",
        paragraphId: entry.alertId,
        message: `Alert ${entry.alertId} appears more than once.`,
      });
    }
    seen.add(entry.alertId);

    issues.push(...uncitedProseIssues(entry.reason, entry.alertId, ctx.factsText));
    for (const fact of entry.citedFacts) {
      if (!isFactInFacts(fact, ctx.factsText)) {
        issues.push({
          code: "unknown_fact",
          paragraphId: entry.alertId,
          message: `Cited fact "${fact}" is not in the supplied facts.`,
        });
      }
    }
  }

  for (const alert of ctx.alerts) {
    if (!seen.has(alert.id)) {
      issues.push({
        code: "incomplete_order",
        paragraphId: alert.id,
        message: `Alert ${alert.id} is not present in the suggested order.`,
      });
    }
  }
  return issues;
}
