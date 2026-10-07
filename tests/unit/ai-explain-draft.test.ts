import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { loadCorpus } from "../../src/core/rag/corpus";
import { draftAlert } from "../../src/core/ai/draft";
import { explainAlert } from "../../src/core/ai/explain";
import { fixtureKey, loadAiFixtures, type AiFixture } from "../../src/core/ai/fixtures-loader";
import { resolveAiMode } from "../../src/core/ai/generate";
import type { AiClient } from "../../src/core/ai/generate";
import type { AiPrompt } from "../../src/core/ai/prompts";
import { buildScenarioAlerts } from "./ai-scenario-alerts";

const EXPLAIN_HEADINGS = ["Why this was flagged", "Why it matters"];
const EXCEPTION_MEMO_OUTLINE = ["Finding", "Requirement", "Impact", "Corrective action", "Owner and due date"];

describe("explainAlert / draftAlert (§7.4)", () => {
  const corpus = loadCorpus();
  const fixtures = loadAiFixtures();
  const nana = buildScenarioAlerts()[0].alert;
  const nanaFixture = fixtures.get(fixtureKey(nana.ruleId, nana.subject.id))!;
  const clock = new FakeClock("2026-03-05T12:00:00.000Z");

  it("resolveAiMode defaults to fixtures and accepts only known values", () => {
    expect(resolveAiMode({})).toBe("fixtures");
    expect(resolveAiMode({ AI_MODE: "live" })).toBe("live");
    expect(resolveAiMode({ AI_MODE: "off" })).toBe("off");
    expect(resolveAiMode({ AI_MODE: "sometimes" })).toBe("fixtures");
  });

  describe("explain", () => {
    it("off mode returns the deterministic template", async () => {
      const explanation = await explainAlert(nana, { mode: "off", corpus, fixtures });
      expect(explanation.generatedBy).toBe("template");
      expect(explanation.id).toBe(`exp_${nana.id}`);
      expect(explanation.alertId).toBe(nana.id);
      expect(explanation.paragraphs.map((p) => p.heading)).toEqual(EXPLAIN_HEADINGS);
      expect(explanation.paragraphs.map((p) => p.id)).toEqual(["p1", "p2"]);
      expect(explanation.paragraphs.every((p) => p.origin === "template")).toBe(true);
      expect(explanation.paragraphs.every((p) => p.citations.length > 0)).toBe(true);
    });

    it("fixtures mode returns the pre-generated fixture text", async () => {
      const explanation = await explainAlert(nana, { mode: "fixtures", corpus, fixtures });
      expect(explanation.generatedBy).toBe("fixture");
      expect(explanation.paragraphs.every((p) => p.origin === "ai")).toBe(true);
      expect(explanation.paragraphs.map((p) => p.heading)).toEqual(EXPLAIN_HEADINGS);
      expect(explanation.paragraphs[0].text).toBe(nanaFixture.explanation[0].text);
      expect(explanation.paragraphs[1].citations).toEqual(nanaFixture.explanation[1].citations);
    });

    it("fixtures mode falls back when the alert has no fixture", async () => {
      const explanation = await explainAlert(nana, { mode: "fixtures", corpus, fixtures: new Map() });
      expect(explanation.generatedBy).toBe("template");
      expect(explanation.paragraphs.every((p) => p.origin === "template")).toBe(true);
    });

    it("live mode accepts a valid client response after one call", async () => {
      const calls: AiPrompt[] = [];
      const client: AiClient = async (prompt) => {
        calls.push(prompt);
        return JSON.stringify({ paragraphs: nanaFixture.explanation });
      };
      const explanation = await explainAlert(nana, { mode: "live", corpus, fixtures, client });
      expect(explanation.generatedBy).toBe("kimi");
      expect(explanation.paragraphs.every((p) => p.origin === "ai")).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].user).toContain("FACTS");
    });

    it("live mode retries once with the failure reasons appended", async () => {
      const bad = JSON.stringify({
        paragraphs: [
          { heading: "Why this was flagged", text: "Risk score 999 with severity medium.", citations: [], evidenceRefs: [] },
        ],
      });
      const good = JSON.stringify({ paragraphs: nanaFixture.explanation });
      const calls: AiPrompt[] = [];
      const client: AiClient = async (prompt) => {
        calls.push(prompt);
        return calls.length === 1 ? bad : good;
      };
      const explanation = await explainAlert(nana, { mode: "live", corpus, fixtures, client });
      expect(explanation.generatedBy).toBe("kimi");
      expect(calls).toHaveLength(2);
      expect(calls[1].user).toContain("failed validation");
      expect(calls[1].user).toContain("not in the supplied facts");
    });

    it("live mode falls back to the template after two invalid attempts", async () => {
      const bad = JSON.stringify({ paragraphs: [{ heading: "Why this was flagged", text: "Risk score 999 with severity medium.", citations: [], evidenceRefs: [] }] });
      const calls: AiPrompt[] = [];
      const client: AiClient = async (prompt) => {
        calls.push(prompt);
        return bad;
      };
      const explanation = await explainAlert(nana, { mode: "live", corpus, fixtures, client });
      expect(calls).toHaveLength(2);
      expect(explanation.generatedBy).toBe("template");
      expect(explanation.paragraphs.every((p) => p.origin === "template")).toBe(true);
    });
  });

  describe("draft", () => {
    it("off mode returns the deterministic template with the clock's timestamp", async () => {
      const draft = await draftAlert(nana, { mode: "off", corpus, fixtures, clock });
      expect(draft.generatedBy).toBe("template");
      expect(draft.id).toBe(`drf_${nana.id}`);
      expect(draft.kind).toBe("exception_memo");
      expect(draft.createdAt).toBe("2026-03-05T12:00:00.000Z");
      expect(draft.paragraphs.map((p) => p.heading)).toEqual(EXCEPTION_MEMO_OUTLINE);
      expect(draft.paragraphs.every((p) => p.origin === "template")).toBe(true);
    });

    it("fixtures mode returns the pre-generated draft text", async () => {
      const draft = await draftAlert(nana, { mode: "fixtures", corpus, fixtures, clock });
      expect(draft.generatedBy).toBe("fixture");
      expect(draft.kind).toBe("exception_memo");
      expect(draft.paragraphs.map((p) => p.heading)).toEqual(EXCEPTION_MEMO_OUTLINE);
      expect(draft.paragraphs[0].text).toBe(nanaFixture.draft.paragraphs[0].text);
      expect(draft.paragraphs.every((p) => p.origin === "ai")).toBe(true);
    });

    it("fixtures mode ignores a fixture whose draft kind does not match the rule", async () => {
      const mismatched = new Map<string, AiFixture>(fixtures);
      const original = nanaFixture;
      mismatched.set(fixtureKey(nana.ruleId, nana.subject.id), {
        ...original,
        draft: { ...original.draft, kind: "sar" },
      });
      const draft = await draftAlert(nana, { mode: "fixtures", corpus, fixtures: mismatched, clock });
      expect(draft.generatedBy).toBe("template");
      expect(draft.kind).toBe("exception_memo");
    });

    it("live mode accepts a valid client response", async () => {
      const calls: AiPrompt[] = [];
      const client: AiClient = async (prompt) => {
        calls.push(prompt);
        return JSON.stringify({ paragraphs: nanaFixture.draft.paragraphs });
      };
      const draft = await draftAlert(nana, { mode: "live", corpus, fixtures, clock, client });
      expect(draft.generatedBy).toBe("kimi");
      expect(calls).toHaveLength(1);
      expect(calls[0].user).toContain("OUTLINE");
    });

    it("live mode falls back when the outline does not match", async () => {
      const wrongOutline = JSON.stringify({
        paragraphs: nanaFixture.draft.paragraphs.map((paragraph) => ({ ...paragraph, heading: "Summary" })),
      });
      const calls: AiPrompt[] = [];
      const client: AiClient = async (prompt) => {
        calls.push(prompt);
        return wrongOutline;
      };
      const draft = await draftAlert(nana, { mode: "live", corpus, fixtures, clock, client });
      expect(calls).toHaveLength(2);
      expect(draft.generatedBy).toBe("template");
      expect(draft.paragraphs.map((p) => p.heading)).toEqual(EXCEPTION_MEMO_OUTLINE);
    });
  });
});
