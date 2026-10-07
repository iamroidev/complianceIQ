import { describe, it, expect } from "vitest";
import { loadCorpus } from "../../src/core/rag/corpus";
import { validateCitations } from "../../src/core/rag/validate-citations";

const corpus = loadCorpus();

describe("validateCitations", () => {
  it("accepts every real chunk id in the corpus", () => {
    const ids = corpus.clauses.map((clause) => clause.chunkId);
    expect(validateCitations(ids, corpus)).toEqual({ ok: true, unknown: [] });
  });

  it("rejects fabricated regulation and section ids", () => {
    const result = validateCitations(
      ["cl_31cfr_1020_320x", "doc_payment_approval#sec-9", "cl_soc2_cc9_9"],
      corpus,
    );
    expect(result.ok).toBe(false);
    expect(result.unknown).toEqual([
      "cl_31cfr_1020_320x",
      "cl_soc2_cc9_9",
      "doc_payment_approval#sec-9",
    ]);
  });

  it("deduplicates and sorts the unknown ids", () => {
    const result = validateCitations(["bad_id", "bad_id", "also_bad"], corpus);
    expect(result.unknown).toEqual(["also_bad", "bad_id"]);
  });

  it("accepts an empty citation list", () => {
    expect(validateCitations([], corpus)).toEqual({ ok: true, unknown: [] });
  });

  it("mixes real and fabricated ids and reports only the fabricated ones", () => {
    const result = validateCitations(
      ["cl_45cfr_164_502_b", "doc_access_control#sec-3", "made_up_clause"],
      corpus,
    );
    expect(result).toEqual({ ok: false, unknown: ["made_up_clause"] });
  });
});
