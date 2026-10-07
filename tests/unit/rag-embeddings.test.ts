import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { loadCorpus } from "../../src/core/rag/corpus";
import { loadEmbeddings } from "../../src/core/rag/embeddings";

const corpus = loadCorpus();
const embeddings = loadEmbeddings();

describe("precomputed embeddings", () => {
  it("covers exactly the corpus chunks, both directions", () => {
    const chunkIds = corpus.clauses.map((clause) => clause.chunkId).sort();
    expect(Object.keys(embeddings.documents).sort()).toEqual(chunkIds);
  });

  it("stores unit-length sparse vectors with sorted indices", () => {
    for (const [chunkId, vector] of Object.entries(embeddings.documents)) {
      expect(vector.length, chunkId).toBeGreaterThan(0);
      let sum = 0;
      let previous = -1;
      for (const [index, weight] of vector) {
        expect(index).toBeGreaterThan(previous);
        expect(index).toBeLessThan(embeddings.tokens.length);
        expect(weight).toBeGreaterThan(0);
        previous = index;
        sum += weight * weight;
      }
      expect(Math.sqrt(sum)).toBeCloseTo(1, 9);
    }
  });

  it("is current on disk (precompute-embeddings --check)", () => {
    execFileSync(process.execPath, [join(process.cwd(), "scripts", "precompute-embeddings.ts"), "--check"], {
      stdio: "pipe",
    });
  });
});
