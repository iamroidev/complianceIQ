import { z } from "zod";
import embeddingsJson from "../../data/policy/embeddings.json";
import { tokenize } from "./tokenize";

/** Semantic matches must score above this confidence (MASTER §6.5). */
export const SEMANTIC_THRESHOLD = 0.55;

/** At most this many semantic extras are added to the mapped clauses. */
export const MAX_SEMANTIC_EXTRAS = 2;

const SparseVector = z.array(z.tuple([z.number().int().nonnegative(), z.number()]));

const Embeddings = z.object({
  version: z.literal(1),
  method: z.literal("tfidf-l2"),
  tokens: z.array(z.string().min(1)),
  idf: z.array(z.number()),
  documents: z.record(z.string(), SparseVector),
});

export type Embeddings = z.infer<typeof Embeddings>;
export type SparseVector = z.infer<typeof SparseVector>;

export function loadEmbeddings(): Embeddings {
  const parsed = Embeddings.parse(embeddingsJson);
  if (parsed.tokens.length !== parsed.idf.length) {
    throw new Error("embeddings.json: tokens and idf lengths differ");
  }
  return parsed;
}

/** Encodes query text into an L2-normalised sparse vector over the shared vocabulary. */
export function encodeQuery(text: string, embeddings: Embeddings): SparseVector {
  const counts = new Map<number, number>();
  for (const token of tokenize(text)) {
    const index = embeddings.tokens.indexOf(token);
    if (index === -1) continue;
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  const vector: SparseVector = [...counts.entries()].map(([index, count]) => [
    index,
    (1 + Math.log(count)) * embeddings.idf[index],
  ]);
  const norm = Math.sqrt(vector.reduce((sum, [, weight]) => sum + weight * weight, 0));
  if (norm === 0) return [];
  return vector
    .map(([index, weight]): [number, number] => [index, weight / norm])
    .sort((a, b) => a[0] - b[0]);
}

/** Cosine similarity between a normalised query vector and a stored (normalised) document vector. */
export function cosineSimilarity(query: SparseVector, document: SparseVector): number {
  const doc = new Map(document);
  let score = 0;
  for (const [index, weight] of query) {
    const docWeight = doc.get(index);
    if (docWeight !== undefined) score += weight * docWeight;
  }
  return score;
}
