import type { Alert, Explanation } from "../types";
import { Explanation as ExplanationSchema } from "../types";
import { getRule } from "../engine/rules/index";
import { loadCorpus, type Corpus } from "../rag/corpus";
import { buildAlertFacts } from "./facts";
import { buildExplainPrompt } from "./prompts";
import { fallbackExplainParagraphs } from "./fallbacks/explain";
import { fixtureKey, loadAiFixtures, type AiFixture } from "./fixtures-loader";
import { resolveAiMode, runAiTask, type AiDeps } from "./generate";
import { RawOutput, type RawOutput as RawOutputType } from "./raw";
import { validateParagraphs } from "./validators";

export interface ExplainDeps extends AiDeps {
  corpus?: Corpus;
  fixtures?: Map<string, AiFixture>;
}

/**
 * §7.4 A — Explain: plain language, citing clause ids, every output
 * validated against the alert's own facts with a deterministic fallback.
 */
export async function explainAlert(alert: Alert, deps: ExplainDeps = {}): Promise<Explanation> {
  const rule = getRule(alert.ruleId);
  if (!rule) throw new Error(`Unknown rule for explanation: ${alert.ruleId}`);
  const corpus = deps.corpus ?? loadCorpus();
  const facts = buildAlertFacts(alert, rule, corpus);
  const prompt = buildExplainPrompt(facts);
  const fixture = (deps.fixtures ?? loadAiFixtures()).get(
    fixtureKey(alert.ruleId, alert.subject.id),
  );

  const { output, generatedBy } = await runAiTask<RawOutputType>({
    mode: deps.mode ?? resolveAiMode(),
    prompt,
    parse: (raw) => RawOutput.parse(JSON.parse(raw)),
    validate: (candidate) =>
      validateParagraphs(candidate.paragraphs, {
        alert,
        corpus,
        factsText: facts,
        requireCitations: true,
      }),
    loadFixture: () => (fixture ? { paragraphs: fixture.explanation } : undefined),
    fallback: () => ({ paragraphs: fallbackExplainParagraphs(alert, rule) }),
    client: deps.client,
  });

  return ExplanationSchema.parse({
    id: `exp_${alert.id}`,
    alertId: alert.id,
    paragraphs: output.paragraphs.map((paragraph, index) => ({
      id: `p${index + 1}`,
      ...(paragraph.heading !== undefined ? { heading: paragraph.heading } : {}),
      text: paragraph.text,
      citations: paragraph.citations,
      evidenceRefs: paragraph.evidenceRefs,
      origin: generatedBy === "template" ? "template" : "ai",
    })),
    generatedBy,
  });
}
