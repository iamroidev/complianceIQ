import { describe, it, expect } from "vitest";
import { loadCorpus } from "../../src/core/rag/corpus";
import { mappedChunkIds, ruleMapping } from "../../src/core/rag/mapping";
import { TIER1_RULES } from "../../src/core/engine/rules/index";

const corpus = loadCorpus();
const mapping = ruleMapping();

describe("rule → clause mapping (MASTER §6.5)", () => {
  it("maps every Tier 1 rule to at least one chunk", () => {
    expect(Object.keys(mapping).sort()).toEqual(TIER1_RULES.map((rule) => rule.meta.id).sort());
    for (const rule of TIER1_RULES) {
      expect(mappedChunkIds(rule.meta.id).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("resolves every mapped chunk id in the corpus", () => {
    for (const [ruleId, chunkIds] of Object.entries(mapping)) {
      expect(new Set(chunkIds).size).toBe(chunkIds.length);
      for (const chunkId of chunkIds) {
        expect(corpus.byChunkId.has(chunkId), `${ruleId} → ${chunkId}`).toBe(true);
      }
    }
  });

  it("anchors every rule in our own policy text, not only regulations", () => {
    for (const [ruleId, chunkIds] of Object.entries(mapping)) {
      expect(
        chunkIds.some((id) => id.startsWith("doc_")),
        `${ruleId} has no internal policy anchor`,
      ).toBe(true);
    }
  });

  it("returns an empty list for rules that are not in the mapping", () => {
    expect(mappedChunkIds("NOPE-999")).toEqual([]);
  });
});
