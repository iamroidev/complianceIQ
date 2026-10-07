import type { ExtractionResult, PolicyDocument } from "../types";
import { ExtractionResult as ExtractionResultSchema } from "../types";
import { TIER1_RULES } from "../engine/rules/index";
import { parseSections } from "../rag/parse";
import { buildExtractPrompt } from "./prompts";
import { loadExtractFixture } from "./fixtures-loader";
import { resolveAiMode, runAiTask, type AiDeps } from "./generate";
import { RawExtracted, type RawExtracted as RawExtractedType } from "./raw";
import { validateExtraction } from "./validators";
import type { ExtractedObligation } from "../types";

const OBLIGATION_PATTERN = /\b(must|shall|at least every|no later than)\b/i;
const PROHIBITION_PATTERN = /\b(must never|must not|shall not|may not|never)\b/i;
const STRONG_DEADLINE_PATTERN = /\b(no later than|within|due|before it expires|at the end of)\b/i;
const RECURRING_PATTERN = /\b(annually|monthly|quarterly|each year|each month|each quarter|each January|every year|every quarter|every month|every January|every two years|each cycle)\b/i;
const THRESHOLD_PATTERN = /\b( or more| at least )\b|\bUSD\b.*\bor more\b/i;

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

function inferKind(quote: string): { kind: ExtractedObligation["kind"]; cadence?: ExtractedObligation["cadence"] } {
  if (PROHIBITION_PATTERN.test(quote)) return { kind: "prohibition" };
  if (STRONG_DEADLINE_PATTERN.test(quote)) return { kind: "deadline" };
  if (RECURRING_PATTERN.test(quote)) {
    const cadence = /\b(monthly|each month|every month)\b/i.test(quote)
      ? "monthly"
      : /\b(quarterly|each quarter|every quarter)\b/i.test(quote)
        ? "quarterly"
        : /\b(annually|each year|every year|each January|every January|every two years)\b/i.test(quote)
          ? "annual"
          : undefined;
    return { kind: "recurring", ...(cadence ? { cadence } : {}) };
  }
  if (THRESHOLD_PATTERN.test(quote)) return { kind: "threshold" };
  return { kind: "requirement" };
}

/**
 * §7.4 C fallback: heading and sentence-pattern heuristics over the
 * document's own sections, so every quote is copied from the text itself.
 * Documents without `## N.` sections yield nothing rather than throwing.
 */
export function heuristicExtract(document: PolicyDocument): ExtractedObligation[] {
  if (!/^## \d+\.\s+/m.test(document.text)) return [];
  const obligations: ExtractedObligation[] = [];
  for (const section of parseSections(document.id, document.text)) {
    for (const sentence of section.text.split(SENTENCE_SPLIT)) {
      const quote = sentence.trim();
      if (!quote || !OBLIGATION_PATTERN.test(quote)) continue;
      obligations.push({ title: section.title, ...inferKind(quote), quote });
    }
  }
  return obligations;
}

export interface ExtractDeps extends AiDeps {
  fixture?: RawExtractedType;
}

/**
 * §7.4 C — extract: proposed obligations with exact quotes, validated
 * against the document, one retry then the deterministic heuristics.
 */
export async function extractObligations(
  document: PolicyDocument,
  deps: ExtractDeps = {},
): Promise<ExtractionResult> {
  const knownRuleIds = TIER1_RULES.map((rule) => rule.meta.id);
  const knownRuleIdSet = new Set(knownRuleIds);
  const factsText = `${document.text}\nknownRuleIds: ${knownRuleIds.join(", ")}`;
  const prompt = buildExtractPrompt(document, knownRuleIds);
  const fixture = deps.fixture !== undefined ? deps.fixture : loadExtractFixture(document.id);

  const { output, generatedBy } = await runAiTask<RawExtractedType>({
    mode: deps.mode ?? resolveAiMode(),
    prompt,
    parse: (raw) => RawExtracted.parse(JSON.parse(raw)),
    validate: (candidate) =>
      validateExtraction(candidate.obligations, {
        documentText: factsText,
        knownRuleIds: knownRuleIdSet,
      }),
    loadFixture: () => fixture,
    fallback: () => ({ obligations: heuristicExtract(document) }),
    client: deps.client,
  });

  return ExtractionResultSchema.parse({
    documentId: document.id,
    obligations: output.obligations,
    generatedBy,
  });
}
