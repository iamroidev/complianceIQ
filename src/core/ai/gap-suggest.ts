import type { GapSuggestion, Obligation } from "../types";
import { GapSuggestion as GapSuggestionSchema } from "../types";
import type { Corpus } from "../rag/corpus";
import { loadCorpus } from "../rag/corpus";
import { TIER1_RULES } from "../engine/rules/index";
import { buildGapFacts } from "./facts";
import { buildGapPrompt } from "./prompts";
import { loadGapFixture } from "./fixtures-loader";
import { resolveAiMode, runAiTask, type AiDeps } from "./generate";
import { RawGapSuggestion, type RawGapSuggestion as RawGapSuggestionType } from "./raw";
import { validateGapSuggestion } from "./validators";

function fallbackGapSuggestion(obligation: Obligation): RawGapSuggestionType {
  const kind = obligation.kind;
  const text =
    kind === "threshold"
      ? "A sampled check would satisfy this threshold until an automated check exists."
      : kind === "requirement" || kind === "prohibition"
        ? "A periodic attestation with supporting evidence would satisfy this obligation until an automated check exists."
        : "A dated record of each completed cycle would satisfy this obligation until an automated check exists.";
  const suggestedCheck =
    kind === "recurring"
      ? "Record the completion date for each cycle and attach the supporting evidence."
      : kind === "deadline"
        ? "Record the due date and the evidence that the obligation was met on time."
        : kind === "threshold"
          ? "Compare results against the stated threshold each cycle and attach the evidence."
          : kind === "prohibition"
            ? "Record the periodic confirmation that the prohibition is upheld."
            : "Attach evidence of performance at the interval the policy expects.";
  return { text, citedQuote: obligation.source.quote, suggestedCheck };
}

export interface GapDeps extends AiDeps {
  corpus?: Corpus;
  fixture?: RawGapSuggestionType;
}

/**
 * §7.4 E — gap suggestion: what check or evidence would satisfy an
 * obligation that has no automated check, quoted from the obligation itself.
 */
export async function suggestGap(
  obligation: Obligation,
  deps: GapDeps = {},
): Promise<GapSuggestion> {
  const corpus = deps.corpus ?? loadCorpus();
  const document = corpus.documents.find((doc) => doc.id === obligation.source.documentId);
  if (!document) {
    throw new Error(
      `Unknown document for obligation ${obligation.id}: ${obligation.source.documentId}`,
    );
  }
  const knownRuleIds = TIER1_RULES.map((rule) => rule.meta.id);
  const knownRuleIdSet = new Set(knownRuleIds);
  const facts = buildGapFacts(obligation, document, knownRuleIds);
  const prompt = buildGapPrompt(facts, knownRuleIds);
  const fixture = deps.fixture !== undefined ? deps.fixture : loadGapFixture(obligation.id);

  const { output, generatedBy } = await runAiTask<RawGapSuggestionType>({
    mode: deps.mode ?? resolveAiMode(),
    prompt,
    parse: (raw) => RawGapSuggestion.parse(JSON.parse(raw)),
    validate: (candidate) =>
      validateGapSuggestion(candidate, {
        obligation,
        documentText: document.text,
        factsText: facts,
        knownRuleIds: knownRuleIdSet,
      }),
    loadFixture: () => fixture,
    fallback: () => fallbackGapSuggestion(obligation),
    client: deps.client,
  });

  return GapSuggestionSchema.parse({
    id: `gap_${obligation.id}`,
    obligationId: obligation.id,
    documentId: document.id,
    text: output.text,
    citedQuote: output.citedQuote,
    suggestedCheck: output.suggestedCheck,
    generatedBy,
  });
}
