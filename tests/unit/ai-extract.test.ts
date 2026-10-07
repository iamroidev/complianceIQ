import { describe, expect, it } from "vitest";
import { loadCorpus } from "../../src/core/rag/corpus";
import { extractObligations, heuristicExtract } from "../../src/core/ai/extract-obligations";
import { loadExtractFixture } from "../../src/core/ai/fixtures-loader";
import { validateExtraction } from "../../src/core/ai/validators";
import { isQuoteInDocument } from "../../src/core/ai/validators/quotes";
import { TIER1_RULES } from "../../src/core/engine/rules/index";
import type { AiClient } from "../../src/core/ai/generate";
import type { AiPrompt } from "../../src/core/ai/prompts";
import type { ExtractedObligation, PolicyDocument } from "../../src/core/types";

const KNOWN_RULE_IDS = TIER1_RULES.map((rule) => rule.meta.id);
const known = new Set(KNOWN_RULE_IDS);
const OBLIGATION_SENTENCE = /\b(must|shall|at least every|no later than)\b/i;

describe("extractObligations (§7.4 C)", () => {
  const corpus = loadCorpus();
  const doc = (id: string): PolicyDocument =>
    corpus.documents.find((candidate) => candidate.id === id)!;
  const training = doc("doc_training_certification");
  const calendar = doc("doc_regulatory_calendar");
  const access = doc("doc_access_control");
  const internalDocs = corpus.documents.filter((candidate) => candidate.kind === "internal_demo");
  const trainingFixture = loadExtractFixture("doc_training_certification")!;
  const factsOf = (document: PolicyDocument): string =>
    `${document.text}\nknownRuleIds: ${KNOWN_RULE_IDS.join(", ")}`;

  it("fixtures mode returns the pre-generated extraction for the training document", async () => {
    const result = await extractObligations(training, { mode: "fixtures" });
    expect(result.generatedBy).toBe("fixture");
    expect(result.documentId).toBe("doc_training_certification");
    expect(result.obligations).toHaveLength(7);
    for (const obligation of result.obligations) {
      expect(isQuoteInDocument(obligation.quote, training.text)).toBe(true);
    }
    expect(result.obligations[0].suggestedRuleId).toBe("CERT-001");
    expect(result.obligations[1]).toMatchObject({ kind: "recurring", cadence: "annual" });
    expect(result.obligations[3].kind).toBe("prohibition");
    expect(result.obligations[4].suggestedRuleId).toBeUndefined();
    expect(result.obligations[5]).toMatchObject({ kind: "recurring", cadence: "monthly", suggestedRuleId: "DEAD-001" });
    expect(validateExtraction(result.obligations, { documentText: factsOf(training), knownRuleIds: known })).toEqual([]);
  });

  it("fixtures mode returns the pre-generated extraction for the regulatory calendar", async () => {
    const result = await extractObligations(calendar, { mode: "fixtures" });
    expect(result.generatedBy).toBe("fixture");
    expect(result.obligations).toHaveLength(7);
    expect(result.obligations.every((obligation) => obligation.suggestedRuleId === "DEAD-001")).toBe(true);
    expect(result.obligations.every((obligation) => isQuoteInDocument(obligation.quote, calendar.text))).toBe(true);
    expect(result.obligations.map((obligation) => obligation.kind)).toContain("deadline");
  });

  it("fixtures mode falls back to the heuristics when the document has no fixture", async () => {
    const result = await extractObligations(access, { mode: "fixtures" });
    expect(result.generatedBy).toBe("template");
    expect(result.documentId).toBe("doc_access_control");
    expect(result.obligations.length).toBeGreaterThan(0);
    for (const obligation of result.obligations) {
      expect(OBLIGATION_SENTENCE.test(obligation.quote)).toBe(true);
      expect(isQuoteInDocument(obligation.quote, access.text)).toBe(true);
    }
    expect(validateExtraction(result.obligations, { documentText: factsOf(access), knownRuleIds: known })).toEqual([]);
  });

  it("off mode is the same deterministic heuristics", async () => {
    const off = await extractObligations(training, { mode: "off" });
    expect(off.generatedBy).toBe("template");
    expect(validateExtraction(off.obligations, { documentText: factsOf(training), knownRuleIds: known })).toEqual([]);
  });

  it("heuristics extract only quotable sentences from every internal document", () => {
    expect(internalDocs).toHaveLength(8);
    for (const document of internalDocs) {
      const obligations = heuristicExtract(document);
      expect(obligations.length).toBeGreaterThan(0);
      for (const obligation of obligations) {
        expect(OBLIGATION_SENTENCE.test(obligation.quote)).toBe(true);
        expect(isQuoteInDocument(obligation.quote, document.text)).toBe(true);
      }
      expect(
        validateExtraction(obligations, { documentText: factsOf(document), knownRuleIds: known }),
      ).toEqual([]);
    }
  });

  it("live mode accepts a valid client response after one call", async () => {
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return JSON.stringify(trainingFixture);
    };
    const result = await extractObligations(training, { mode: "live", client });
    expect(result.generatedBy).toBe("kimi");
    expect(result.obligations).toHaveLength(7);
    expect(calls).toHaveLength(1);
    expect(calls[0].user).toContain("KNOWN RULE IDS:");
    expect(calls[0].user).toContain("DOCUMENT doc_training_certification");
    expect(calls[0].user).toContain("CERT-001");
  });

  it("live mode retries once when a quote is not in the document", async () => {
    const badQuote = {
      obligations: [
        { title: "Purpose", kind: "requirement", quote: "This sentence is not in any policy document." },
      ],
    };
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return calls.length === 1 ? JSON.stringify(badQuote) : JSON.stringify(trainingFixture);
    };
    const result = await extractObligations(training, { mode: "live", client });
    expect(result.generatedBy).toBe("kimi");
    expect(calls).toHaveLength(2);
    expect(calls[1].user).toContain("failed validation");
    expect(calls[1].user).toContain("substring of the document");
  });

  it("live mode falls back to the heuristics after two invalid attempts", async () => {
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return JSON.stringify({ obligations: [{ title: "Purpose", kind: "bogus", quote: "Anything." }] });
    };
    const result = await extractObligations(training, { mode: "live", client });
    expect(calls).toHaveLength(2);
    expect(result.generatedBy).toBe("template");
    expect(result.obligations.length).toBeGreaterThan(0);
    expect(result.obligations.every((obligation) => isQuoteInDocument(obligation.quote, training.text))).toBe(true);
  });
});

describe("validateExtraction (§11)", () => {
  const corpus = loadCorpus();
  const training = corpus.documents.find((candidate) => candidate.id === "doc_training_certification")!;
  const calendar = corpus.documents.find((candidate) => candidate.id === "doc_regulatory_calendar")!;
  const valid: ExtractedObligation = {
    title: "Renew certificates 30 days ahead",
    kind: "deadline",
    quote: "Staff must renew each certificate at least 30 days before it expires.",
  };
  const run = (obligations: readonly ExtractedObligation[], document: PolicyDocument = training) =>
    validateExtraction(obligations, {
      documentText: `${document.text}\nknownRuleIds: ${KNOWN_RULE_IDS.join(", ")}`,
      knownRuleIds: known,
    });

  it("accepts the whole pre-generated fixture", () => {
    expect(run(loadExtractFixture("doc_training_certification")!.obligations)).toEqual([]);
    expect(run(loadExtractFixture("doc_regulatory_calendar")!.obligations, calendar)).toEqual([]);
  });

  it("rejects a quote that is not in the document", () => {
    const issues = run([{ ...valid, quote: "Staff must renew each certificate at least 90 days before it expires." }]);
    expect(issues.map((issue) => issue.code)).toEqual(["missing_quote"]);
  });

  it("accepts a re-wrapped quote after whitespace normalisation", () => {
    const rewrapped = { ...valid, quote: "Staff must renew each certificate\n  at least 30 days before it expires." };
    expect(run([rewrapped])).toEqual([]);
  });

  it("rejects a fabricated number in the title", () => {
    const issues = run([{ ...valid, title: "Renew certificates 99 days ahead" }]);
    expect(issues.map((issue) => issue.code)).toEqual(["fabricated_number"]);
  });

  it("rejects a forbidden phrase in the title", () => {
    const issues = run([{ ...valid, title: "Certified staff register" }]);
    expect(issues.map((issue) => issue.code)).toContain("forbidden_phrase");
  });

  it("rejects a name that is not in the document", () => {
    const issues = run([{ ...valid, title: "Renewed by Zanzibar Holdings" }]);
    expect(issues.map((issue) => issue.code)).toContain("fabricated_name");
  });

  it("rejects an invented rule id and accepts a real one", () => {
    expect(run([{ ...valid, suggestedRuleId: "CERT-999" }]).map((issue) => issue.code)).toEqual(["unknown_rule_id"]);
    expect(run([{ ...valid, suggestedRuleId: "CERT-001" }])).toEqual([]);
  });

  it("an empty extraction is valid — no obligation without a quote, not one missing", () => {
    expect(run([])).toEqual([]);
  });
});
