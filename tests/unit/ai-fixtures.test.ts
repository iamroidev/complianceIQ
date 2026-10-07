import { describe, expect, it } from "vitest";
import { loadCorpus } from "../../src/core/rag/corpus";
import { getRule } from "../../src/core/engine/rules/index";
import { buildAlertFacts } from "../../src/core/ai/facts";
import { fixtureKey, loadAiFixtures } from "../../src/core/ai/fixtures-loader";
import { DOSSIER_OUTLINES } from "../../src/core/ai/outlines";
import { validateOutline, validateParagraphs } from "../../src/core/ai/validators";
import { buildScenarioAlerts } from "./ai-scenario-alerts";

const EXPLAIN_HEADINGS = ["Why this was flagged", "Why it matters"];

describe("AI fixtures are validated against the real alerts", () => {
  const corpus = loadCorpus();
  const fixtures = loadAiFixtures();
  const scenarios = buildScenarioAlerts();

  it("loads one fixture per scenario, no duplicate keys", () => {
    expect(fixtures.size).toBe(11);
    expect(scenarios).toHaveLength(11);
    for (const { scenarioId, alert } of scenarios) {
      const fixture = fixtures.get(fixtureKey(alert.ruleId, alert.subject.id));
      expect(fixture, `missing fixture for ${scenarioId}`).toBeDefined();
      expect(fixture!.scenarioId).toBe(scenarioId);
    }
  });

  for (const { scenarioId, alert } of buildScenarioAlerts()) {
    it(`${scenarioId}: explanation passes every validator`, () => {
      const fixture = fixtures.get(fixtureKey(alert.ruleId, alert.subject.id))!;
      const rule = getRule(alert.ruleId)!;
      const facts = buildAlertFacts(alert, rule, corpus);

      const issues = validateParagraphs(fixture.explanation, {
        alert,
        corpus,
        factsText: facts,
        requireCitations: true,
      });
      expect(issues).toEqual([]);
      expect(fixture.explanation.map((p) => p.heading)).toEqual(EXPLAIN_HEADINGS);
      expect(fixture.explanation.every((p) => p.citations.length > 0)).toBe(true);
    });

    it(`${scenarioId}: draft follows the outline and passes every validator`, () => {
      const fixture = fixtures.get(fixtureKey(alert.ruleId, alert.subject.id))!;
      const rule = getRule(alert.ruleId)!;
      const facts = buildAlertFacts(alert, rule, corpus);

      expect(fixture.draft.kind).toBe(rule.meta.dossier);
      const outline = DOSSIER_OUTLINES[fixture.draft.kind];
      expect(validateOutline(fixture.draft.paragraphs, outline)).toEqual([]);
      const issues = validateParagraphs(fixture.draft.paragraphs, {
        alert,
        corpus,
        factsText: facts,
      });
      expect(issues).toEqual([]);
    });
  }
});
