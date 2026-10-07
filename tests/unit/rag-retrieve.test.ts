import { describe, it, expect } from "vitest";
import { loadCorpus, type Corpus } from "../../src/core/rag/corpus";
import {
  loadEmbeddings,
  encodeQuery,
  cosineSimilarity,
  SEMANTIC_THRESHOLD,
  MAX_SEMANTIC_EXTRAS,
  type Embeddings,
} from "../../src/core/rag/embeddings";
import { mappedChunkIds } from "../../src/core/rag/mapping";
import { retrievePolicyRefs } from "../../src/core/rag/retrieve";
import { tokenize } from "../../src/core/rag/tokenize";
import { sentenceAt } from "../../src/components/workspace/case-text";
import { TIER1_RULES } from "../../src/core/engine/rules/index";
import { PolicyClause } from "../../src/core/types";

const corpus = loadCorpus();
const embeddings = loadEmbeddings();

const clauseStub = (chunkId: string): PolicyClause =>
  PolicyClause.parse({
    chunkId,
    documentId: "doc_payment_approval",
    regulation: "Internal policy",
    citation: "Section 2",
    title: "Fixture",
    text: "Fixture text.",
    textKind: "verbatim",
  });

const miniCorpus = (chunkIds: string[]): Corpus => ({
  documents: [],
  clauses: chunkIds.map(clauseStub),
  byChunkId: new Map(chunkIds.map((id) => [id, clauseStub(id)])),
});

/** Unit vector [score, sqrt(1 - score^2)] over tokens alpha/beta. */
const unitVector = (score: number): [number, number][] => [
  [0, score],
  [1, Math.sqrt(1 - score * score)],
];

const miniEmbeddings = (documents: Record<string, [number, number][]>): Embeddings => ({
  version: 1,
  method: "tfidf-l2",
  tokens: ["alpha", "beta"],
  idf: [1, 1],
  documents,
});

describe("query encoding and cosine", () => {
  it("normalises the query vector over the shared vocabulary", () => {
    const query = encodeQuery(embeddings.tokens[0], embeddings);
    expect(query).toHaveLength(1);
    let sum = 0;
    for (const [, weight] of query) sum += weight * weight;
    expect(Math.sqrt(sum)).toBeCloseTo(1, 9);
  });

  it("keeps only tokens that exist in the vocabulary", () => {
    const query = encodeQuery(`${embeddings.tokens[0]} zzzzunknown`, embeddings);
    expect(query).toHaveLength(1);
    expect(query[0][0]).toBe(0);
  });

  it("scores a single-token query as the document weight at that token", () => {
    const emb = miniEmbeddings({ "x#1": unitVector(0.549) });
    const query = encodeQuery("alpha", emb);
    expect(query).toEqual([[0, 1]]);
    expect(cosineSimilarity(query, emb.documents["x#1"])).toBeCloseTo(0.549, 6);
  });

  it("returns an empty vector when no query token is known", () => {
    expect(encodeQuery("zzzzunknown", embeddings)).toEqual([]);
  });
});

describe("retrievePolicyRefs on the real corpus", () => {
  it("always leads with every mapped clause at confidence 1", () => {
    for (const rule of TIER1_RULES) {
      const mapped = mappedChunkIds(rule.meta.id);
      const refs = retrievePolicyRefs(rule.meta.id, "quarterly filing deadline", corpus, embeddings);
      expect(
        refs
          .slice(0, mapped.length)
          .map((ref) => ({ chunkId: ref.chunkId, reason: ref.reason, confidence: ref.confidence })),
      ).toEqual(mapped.map((chunkId) => ({ chunkId, reason: "mapped", confidence: 1 })));
      expect(refs.length).toBeLessThanOrEqual(mapped.length + MAX_SEMANTIC_EXTRAS);
      for (const ref of refs) expect(corpus.byChunkId.has(ref.chunkId)).toBe(true);
    }
  });

  it("highlights a sentence that actually overlaps the query", () => {
    const query = "structuring cash deposits just under the reporting limit";
    const queryTokens = new Set(tokenize(query));
    const refs = retrievePolicyRefs("AML-001", query, corpus, embeddings);
    expect(refs.some((ref) => ref.highlightSpan !== undefined)).toBe(true);
    for (const ref of refs) {
      if (!ref.highlightSpan) continue;
      const clause = corpus.byChunkId.get(ref.chunkId);
      expect(clause).toBeDefined();
      if (!clause) continue;
      const [start, end] = ref.highlightSpan;
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      expect(end).toBeLessThanOrEqual(clause.text.length);
      const overlap = tokenize(clause.text.slice(start, end)).filter((token) =>
        queryTokens.has(token),
      );
      expect(overlap.length).toBeGreaterThan(0);
      // The span must sit on a sentence boundary so sentenceAt can expand it.
      expect(sentenceAt(clause.text, ref.highlightSpan)).toBeTruthy();
    }
  });

  it("adds semantic extras above 0.55 only, best score first, never duplicating mapped ids", () => {
    const refs = retrievePolicyRefs("AML-001", "structuring cash deposits just under the reporting limit", corpus, embeddings);
    const mapped = new Set(mappedChunkIds("AML-001"));
    const seen = new Set<string>();
    for (const ref of refs) {
      expect(seen.has(ref.chunkId)).toBe(false);
      seen.add(ref.chunkId);
      if (ref.reason === "semantic") {
        expect(ref.confidence).toBeGreaterThan(SEMANTIC_THRESHOLD);
        expect(mapped.has(ref.chunkId)).toBe(false);
      }
    }
    const semantic = refs.filter((ref) => ref.reason === "semantic");
    expect(semantic.length).toBeLessThanOrEqual(MAX_SEMANTIC_EXTRAS);
    for (let i = 1; i < semantic.length; i++) {
      expect(semantic[i - 1].confidence).toBeGreaterThanOrEqual(semantic[i].confidence);
    }
  });

  it("is deterministic for the same inputs", () => {
    const query = "vendor documents required for critical tier";
    expect(retrievePolicyRefs("VEND-001", query, corpus, embeddings)).toEqual(
      retrievePolicyRefs("VEND-001", query, corpus, embeddings),
    );
  });

  it("returns only mapped refs when the query has no known vocabulary", () => {
    const refs = retrievePolicyRefs("CERT-001", "zzzzunknown zzzzalsounknown", corpus, embeddings);
    expect(refs.every((ref) => ref.reason === "mapped")).toBe(true);
  });

  it("throws for an unmapped rule and for a mapping that leaves the corpus", () => {
    expect(() => retrievePolicyRefs("NOPE-999", "anything", corpus, embeddings)).toThrow(
      /No policy mapping/,
    );
    const missing = mappedChunkIds("FIN-001")[0];
    const broken: Corpus = { ...corpus, byChunkId: new Map(corpus.byChunkId) };
    broken.byChunkId.delete(missing);
    expect(() => retrievePolicyRefs("FIN-001", "anything", broken, embeddings)).toThrow(
      /not in corpus/,
    );
  });
});

describe("semantic threshold behaviour (controlled fixture)", () => {
  const finMapped = mappedChunkIds("FIN-001");
  const fixture = miniCorpus([...finMapped, "near#1", "edge#1", "above#1"]);
  const emb = miniEmbeddings({
    "near#1": unitVector(0.549),
    "edge#1": unitVector(0.55),
    "above#1": unitVector(0.551),
  });

  it("keeps scores above 0.55 and drops 0.55 and below", () => {
    const refs = retrievePolicyRefs("FIN-001", "alpha", fixture, emb);
    expect(refs.map((ref) => ref.chunkId)).toEqual([...finMapped, "above#1"]);
    expect(refs.at(-1)?.confidence).toBeCloseTo(0.551, 6);
  });

  it("honours a caller-supplied threshold", () => {
    const refs = retrievePolicyRefs("FIN-001", "alpha", fixture, emb, { threshold: 0.54, maxExtras: 3 });
    expect(refs.map((ref) => ref.chunkId)).toEqual([...finMapped, "above#1", "edge#1", "near#1"]);
  });

  it("caps semantic extras at maxExtras, best first, ties broken by chunk id", () => {
    const tied = miniCorpus([...finMapped, "c1#1", "c2#1", "c3#1", "tie_a#1", "tie_b#1"]);
    const capped = miniEmbeddings({
      "c1#1": unitVector(0.9),
      "c2#1": unitVector(0.8),
      "c3#1": unitVector(0.7),
      "tie_a#1": unitVector(0.6),
      "tie_b#1": unitVector(0.6),
    });
    const refs = retrievePolicyRefs("FIN-001", "alpha", tied, capped);
    expect(refs.map((ref) => ref.chunkId)).toEqual([...finMapped, "c1#1", "c2#1"]);
    expect(refs.at(-1)?.confidence).toBeCloseTo(0.8, 6);

    const noExtras = retrievePolicyRefs("FIN-001", "alpha", tied, capped, { maxExtras: 0 });
    expect(noExtras.map((ref) => ({ chunkId: ref.chunkId, reason: ref.reason, confidence: ref.confidence }))).toEqual(
      finMapped.map((chunkId) => ({ chunkId, reason: "mapped", confidence: 1 })),
    );

    const oneTie = retrievePolicyRefs("FIN-001", "alpha", tied, miniEmbeddings({
      "tie_a#1": unitVector(0.6),
      "tie_b#1": unitVector(0.6),
    }), { maxExtras: 1 });
    expect(oneTie.map((ref) => ref.chunkId)).toEqual([...finMapped, "tie_a#1"]);
  });
});
