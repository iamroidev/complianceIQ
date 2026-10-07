import type { Clock } from "../clock";
import { SystemClock } from "../clock";
import type { Alert, Draft } from "../types";
import { Draft as DraftSchema } from "../types";
import { getRule } from "../engine/rules/index";
import { loadCorpus, type Corpus } from "../rag/corpus";
import { buildAlertFacts } from "./facts";
import { buildDraftPrompt } from "./prompts";
import { fallbackDraftParagraphs } from "./fallbacks/draft";
import { fixtureKey, loadAiFixtures, type AiFixture } from "./fixtures-loader";
import { resolveAiMode, runAiTask, type AiDeps } from "./generate";
import { DOSSIER_OUTLINES } from "./outlines";
import { RawOutput, type RawOutput as RawOutputType } from "./raw";
import { validateOutline, validateParagraphs } from "./validators";

export interface DraftDeps extends AiDeps {
  corpus?: Corpus;
  fixtures?: Map<string, AiFixture>;
  clock?: Clock;
}

/**
 * §7.4 B — Draft: the dossier for the alert's rule kind, outline enforced,
 * every output validated against the alert's facts with a template fallback.
 * The ledger `DRAFT_GENERATED` block is appended by the pipeline (M8).
 */
export async function draftAlert(alert: Alert, deps: DraftDeps = {}): Promise<Draft> {
  const rule = getRule(alert.ruleId);
  if (!rule) throw new Error(`Unknown rule for draft: ${alert.ruleId}`);
  const kind = rule.meta.dossier;
  const outline = DOSSIER_OUTLINES[kind];
  const corpus = deps.corpus ?? loadCorpus();
  const facts = buildAlertFacts(alert, rule, corpus);
  const prompt = buildDraftPrompt(facts, outline);
  const fixture = (deps.fixtures ?? loadAiFixtures()).get(
    fixtureKey(alert.ruleId, alert.subject.id),
  );

  const { output, generatedBy } = await runAiTask<RawOutputType>({
    mode: deps.mode ?? resolveAiMode(),
    prompt,
    parse: (raw) => RawOutput.parse(JSON.parse(raw)),
    validate: (candidate) => [
      ...validateOutline(candidate.paragraphs, outline),
      ...validateParagraphs(candidate.paragraphs, { alert, corpus, factsText: facts }),
    ],
    loadFixture: () => (fixture?.draft.kind === kind ? { paragraphs: fixture.draft.paragraphs } : undefined),
    fallback: () => ({ paragraphs: fallbackDraftParagraphs(alert, rule, kind) }),
    client: deps.client,
  });

  const clock = deps.clock ?? new SystemClock();
  return DraftSchema.parse({
    id: `drf_${alert.id}`,
    alertId: alert.id,
    kind,
    paragraphs: output.paragraphs.map((paragraph, index) => ({
      id: `p${index + 1}`,
      ...(paragraph.heading !== undefined ? { heading: paragraph.heading } : {}),
      text: paragraph.text,
      citations: paragraph.citations,
      evidenceRefs: paragraph.evidenceRefs,
      origin: generatedBy === "template" ? "template" : "ai",
    })),
    generatedBy,
    createdAt: clock.now(),
  });
}
