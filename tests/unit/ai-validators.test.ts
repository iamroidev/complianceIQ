import { describe, expect, it } from "vitest";
import { loadCorpus } from "../../src/core/rag/corpus";
import { getRule } from "../../src/core/engine/rules/index";
import { buildAlertFacts } from "../../src/core/ai/facts";
import { DOSSIER_OUTLINES } from "../../src/core/ai/outlines";
import { fallbackExplainParagraphs } from "../../src/core/ai/fallbacks/explain";
import { fallbackDraftParagraphs } from "../../src/core/ai/fallbacks/draft";
import {
  validateExplanation,
  validateOutline,
  validateParagraphs,
  type AiValidationContext,
  type ValidatableParagraph,
} from "../../src/core/ai/validators";
import { buildScenarioAlerts } from "./ai-scenario-alerts";

describe("AI validators (§7.4, §11)", () => {
  const corpus = loadCorpus();
  const scenarios = buildScenarioAlerts();
  const { alert } = scenarios[0];
  const realChunk = alert.policyRefs[0].chunkId;
  const factsText =
    "summary: security awareness certificate on file. observed deposit USD 9,800.00 within 34 hours. snapshot ev_0.";
  const ctx: AiValidationContext = { alert, corpus, factsText };

  const paragraph = (overrides: Partial<ValidatableParagraph> = {}): ValidatableParagraph => ({
    heading: "Finding",
    text: "The Security awareness certificate is missing. Review due by tomorrow.",
    citations: [realChunk],
    evidenceRefs: [],
    ...overrides,
  });

  const codes = (paragraphs: ValidatableParagraph[], context: AiValidationContext = ctx) =>
    validateParagraphs(paragraphs, context).map((issue) => issue.code);

  it("accepts a clean paragraph", () => {
    expect(codes([paragraph()])).toEqual([]);
  });

  it("rejects a fabricated chunk id", () => {
    expect(codes([paragraph({ citations: ["doc_missing#sec-9"] })])).toContain("fabricated_chunk_id");
  });

  it("rejects an evidence ref the alert does not own", () => {
    expect(codes([paragraph({ evidenceRefs: [{ type: "record", id: "rec_nope" }] })])).toContain(
      "unknown_evidence_ref",
    );
    expect(codes([paragraph({ evidenceRefs: [{ type: "evidence", id: "ev_0" }] })])).toEqual([]);
  });

  it("rejects every forbidden phrase", () => {
    const samples: Record<string, string> = {
      guilty: "The auditor found the team guilty.",
      "committed a crime": "The person committed a crime.",
      "compliant with": "The report is compliant with the rule.",
      certified: "The issuer certified the holder.",
      "filed with": "The receipt was filed with the register.",
    };
    for (const [phrase, text] of Object.entries(samples)) {
      expect(codes([paragraph({ text, citations: [] })]), phrase).toContain("forbidden_phrase");
    }
  });

  it("rejects a legal conclusion without a citation, accepts it with one", () => {
    const text = "The transaction was illegal.";
    expect(codes([paragraph({ text, citations: [] })])).toContain("legal_conclusion");
    expect(codes([paragraph({ text })])).toEqual([]);
  });

  it("rejects a number that is not in the supplied facts", () => {
    expect(codes([paragraph({ text: "Risk score 999 with severity medium." })])).toContain(
      "fabricated_number",
    );
  });

  it("accepts honest number formatting differences", () => {
    expect(codes([paragraph({ text: "The deposit total is USD 9,800.00." })])).toEqual([]);
    expect(codes([paragraph({ text: "The deposit total is 9800 flat." })])).toEqual([]);
  });

  it("rejects a name that is not in the supplied facts", () => {
    expect(codes([paragraph({ text: "The certificate was issued by Zorp Labs." })])).toContain(
      "fabricated_name",
    );
  });

  it("skips sentence-initial capitals and accepts known mid-sentence names", () => {
    expect(codes([paragraph({ text: "Review due by tomorrow. Corrective action pending." })])).toEqual([]);
    expect(codes([paragraph({ text: "The deposit happened within 34 hours of detection." })])).toEqual([]);
  });

  it("requires at least one citation when asked", () => {
    const clean = paragraph({ citations: [], evidenceRefs: [] });
    expect(codes([clean], { ...ctx, requireCitations: true })).toEqual(["missing_citation"]);
    expect(codes([clean])).toEqual([]);
  });

  it("flags an explanation written for another alert", () => {
    const issues = validateExplanation({ alertId: "alrt_999", paragraphs: [] }, ctx);
    expect(issues.map((issue) => issue.code)).toEqual(["alert_mismatch"]);
  });

  it("flags a draft outline that does not match, in any order", () => {
    const outline = DOSSIER_OUTLINES.exception_memo;
    const wrong = [4, 0, 2, 1, 3].map((index) => paragraph({ heading: outline[index], citations: [] }));
    expect(validateOutline(wrong, outline).map((issue) => issue.code)).toEqual(["outline_mismatch"]);
    expect(validateOutline(outline.map((heading) => paragraph({ heading })), outline)).toEqual([]);
  });

  it("accepts every deterministic fallback for every scenario alert", () => {
    for (const { scenarioId, alert: scenarioAlert } of scenarios) {
      const rule = getRule(scenarioAlert.ruleId)!;
      const facts = buildAlertFacts(scenarioAlert, rule, corpus);

      const explain = fallbackExplainParagraphs(scenarioAlert, rule);
      expect(
        validateParagraphs(explain, {
          alert: scenarioAlert,
          corpus,
          factsText: facts,
          requireCitations: true,
        }),
        `${scenarioId} explain fallback`,
      ).toEqual([]);

      const kind = rule.meta.dossier;
      const draft = fallbackDraftParagraphs(scenarioAlert, rule, kind);
      expect(validateOutline(draft, DOSSIER_OUTLINES[kind]), `${scenarioId} outline`).toEqual([]);
      expect(
        validateParagraphs(draft, { alert: scenarioAlert, corpus, factsText: facts }),
        `${scenarioId} draft fallback`,
      ).toEqual([]);
    }
  });
});
