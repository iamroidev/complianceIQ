import { describe, expect, it } from "vitest";
import { suggestGap } from "../../src/core/ai/gap-suggest";
import { loadGapFixture } from "../../src/core/ai/fixtures-loader";
import { buildGapFacts } from "../../src/core/ai/facts";
import { validateGapSuggestion } from "../../src/core/ai/validators";
import { isQuoteInDocument } from "../../src/core/ai/validators/quotes";
import { loadCorpus } from "../../src/core/rag/corpus";
import { TIER1_RULES } from "../../src/core/engine/rules/index";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import type { AiClient } from "../../src/core/ai/generate";
import type { AiPrompt } from "../../src/core/ai/prompts";
import type { GapValidationContext } from "../../src/core/ai/validators";
import type { Obligation } from "../../src/core/types";

const KNOWN_RULE_IDS = TIER1_RULES.map((rule) => rule.meta.id);

describe("suggestGap (§7.4 E)", () => {
  const corpus = loadCorpus();
  const obligations = loadSeedRegisters().obligations;
  const gapObligations = obligations.filter(
    (obligation) => obligation.ruleIds.length === 0 && obligation.status !== "rejected",
  );
  const find = (id: string): Obligation => {
    const obligation = obligations.find((candidate) => candidate.id === id);
    if (!obligation) throw new Error(`seed obligation ${id} not found`);
    return obligation;
  };
  const accessReview = find("ob_access_review");
  const ctxFor = (obligation: Obligation): GapValidationContext => {
    const document = corpus.documents.find((doc) => doc.id === obligation.source.documentId)!;
    return {
      obligation,
      documentText: document.text,
      factsText: buildGapFacts(obligation, document, KNOWN_RULE_IDS),
      knownRuleIds: new Set(KNOWN_RULE_IDS),
    };
  };

  it("the seed has 15 gap obligations to suggest checks for", () => {
    expect(gapObligations).toHaveLength(15);
  });

  it("fixtures mode returns the pre-generated suggestion with wrapper ids", async () => {
    const fixture = loadGapFixture("ob_access_review")!;
    const suggestion = await suggestGap(accessReview, { mode: "fixtures", corpus });
    expect(suggestion.generatedBy).toBe("fixture");
    expect(suggestion.id).toBe("gap_ob_access_review");
    expect(suggestion.obligationId).toBe("ob_access_review");
    expect(suggestion.documentId).toBe("doc_access_control");
    expect(suggestion.text).toBe(fixture.text);
    expect(suggestion.suggestedCheck).toBe(fixture.suggestedCheck);
    expect(suggestion.citedQuote).toBe(fixture.citedQuote);
  });

  it("fixtures mode falls back when the obligation has no fixture", async () => {
    const suggestion = await suggestGap(find("ob_cert_renewal_notice"), { mode: "fixtures", corpus });
    expect(suggestion.generatedBy).toBe("template");
    expect(suggestion.id).toBe("gap_ob_cert_renewal_notice");
    expect(validateGapSuggestion(suggestion, ctxFor(find("ob_cert_renewal_notice")))).toEqual([]);
  });

  it("every fallback suggestion for all 15 gaps passes the validators", async () => {
    expect.assertions(gapObligations.length * 4);
    for (const obligation of gapObligations) {
      const suggestion = await suggestGap(obligation, { mode: "off", corpus });
      expect(suggestion.generatedBy).toBe("template");
      expect(suggestion.citedQuote).toBe(obligation.source.quote);
      expect(isQuoteInDocument(suggestion.citedQuote, corpus.documents.find((doc) => doc.id === obligation.source.documentId)!.text)).toBe(true);
      expect(validateGapSuggestion(suggestion, ctxFor(obligation))).toEqual([]);
    }
  });

  it("live mode accepts a valid client response after one call", async () => {
    const fixture = loadGapFixture("ob_access_review")!;
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return JSON.stringify(fixture);
    };
    const suggestion = await suggestGap(accessReview, { mode: "live", corpus, client });
    expect(suggestion.generatedBy).toBe("kimi");
    expect(calls).toHaveLength(1);
    expect(calls[0].user).toContain("KNOWN RULE IDS:");
    expect(calls[0].user).toContain("FACTS");
    expect(calls[0].user).toContain("obligationId: ob_access_review");
  });

  it("live mode retries once when the cited quote is not in the document", async () => {
    const fixture = loadGapFixture("ob_access_review")!;
    const bad = { ...fixture, citedQuote: "Access reviews must be completed every full moon." };
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return calls.length === 1 ? JSON.stringify(bad) : JSON.stringify(fixture);
    };
    const suggestion = await suggestGap(accessReview, { mode: "live", corpus, client });
    expect(suggestion.generatedBy).toBe("kimi");
    expect(calls).toHaveLength(2);
    expect(calls[1].user).toContain("failed validation");
    expect(calls[1].user).toContain("substring of the document");
  });

  it("live mode falls back after two invalid attempts", async () => {
    const fixture = loadGapFixture("ob_access_review")!;
    const bad = { ...fixture, suggestedCheck: "Record 99 reviews each cycle." };
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return JSON.stringify(bad);
    };
    const suggestion = await suggestGap(accessReview, { mode: "live", corpus, client });
    expect(calls).toHaveLength(2);
    expect(suggestion.generatedBy).toBe("template");
    expect(validateGapSuggestion(suggestion, ctxFor(accessReview))).toEqual([]);
  });

  it("an obligation from an unknown document is rejected loudly", async () => {
    const orphan: Obligation = {
      ...accessReview,
      source: { ...accessReview.source, documentId: "doc_nope" },
    };
    await expect(suggestGap(orphan, { mode: "off", corpus })).rejects.toThrow(/doc_nope/);
  });
});

describe("validateGapSuggestion (§11)", () => {
  const corpus = loadCorpus();
  const obligations = loadSeedRegisters().obligations;
  const obligation = obligations.find((candidate) => candidate.id === "ob_access_review")!;
  const document = corpus.documents.find((candidate) => candidate.id === "doc_access_control")!;
  const factsText = buildGapFacts(obligation, document, KNOWN_RULE_IDS);
  const ctx: GapValidationContext = {
    obligation,
    documentText: document.text,
    factsText,
    knownRuleIds: new Set(KNOWN_RULE_IDS),
  };
  const valid = {
    text: "A dated review record with sign-off would satisfy this obligation.",
    citedQuote: obligation.source.quote,
    suggestedCheck: "Record the review date and attach the access list evidence each January.",
  };

  it("accepts the pre-generated fixtures", () => {
    expect(validateGapSuggestion(loadGapFixture("ob_access_review")!, ctx)).toEqual([]);
    const vendor = obligations.find((candidate) => candidate.id === "ob_offboarding")!;
    const vendorDoc = corpus.documents.find((candidate) => candidate.id === vendor.source.documentId)!;
    expect(
      validateGapSuggestion(loadGapFixture("ob_offboarding")!, {
        obligation: vendor,
        documentText: vendorDoc.text,
        factsText: buildGapFacts(vendor, vendorDoc, KNOWN_RULE_IDS),
        knownRuleIds: new Set(KNOWN_RULE_IDS),
      }),
    ).toEqual([]);
  });

  it("rejects a cited quote that is not in the document", () => {
    const issues = validateGapSuggestion({ ...valid, citedQuote: "Reviews happen once in a blue moon." }, ctx);
    expect(issues.map((issue) => issue.code)).toEqual(["missing_quote"]);
  });

  it("rejects an invented rule id but allows a real one", () => {
    const invented = validateGapSuggestion({ ...valid, text: `${valid.text} Pair it with CERT-999.` }, ctx);
    expect(invented.map((issue) => issue.code)).toContain("unknown_rule_id");
    const real = validateGapSuggestion({ ...valid, text: `${valid.text} Pair it with CERT-001.` }, ctx);
    expect(real.filter((issue) => issue.code === "unknown_rule_id")).toEqual([]);
    expect(real).toEqual([]);
  });

  it("rejects a forbidden phrase in suggestedCheck", () => {
    const issues = validateGapSuggestion({ ...valid, suggestedCheck: "Keep a certified copy of the record." }, ctx);
    expect(issues.map((issue) => issue.code)).toContain("forbidden_phrase");
  });

  it("rejects a fabricated number in the prose", () => {
    const issues = validateGapSuggestion({ ...valid, text: `${valid.text} The review takes 99 days.` }, ctx);
    expect(issues.map((issue) => issue.code)).toContain("fabricated_number");
  });
});
