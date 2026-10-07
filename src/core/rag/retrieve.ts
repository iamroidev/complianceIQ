import type { Corpus } from "./corpus";
import type { Embeddings } from "./embeddings";
import {
  cosineSimilarity,
  encodeQuery,
  MAX_SEMANTIC_EXTRAS,
  SEMANTIC_THRESHOLD,
} from "./embeddings";
import { mappedChunkIds } from "./mapping";
import { tokenize } from "./tokenize";

export type RetrievedRef = {
  chunkId: string;
  reason: "mapped" | "semantic";
  confidence: number;
  /** Character span of the sentence that best matches the query, for the UI highlight (§6.2). */
  highlightSpan?: [number, number];
};

export type RetrieveOptions = {
  /** Semantic extras must score above this (default 0.55, MASTER §6.5). */
  threshold?: number;
  /** Maximum semantic extras to add (default 2, MASTER §6.5). */
  maxExtras?: number;
};

/**
 * Sentence spans of `text` as [start, end) pairs that exclude the closing
 * punctuation, so `sentenceAt` can expand the span back to the full sentence.
 * Periods inside numbers (9,800.00) never end a sentence because a sentence
 * only ends at punctuation followed by whitespace or the end of the text.
 */
function sentenceRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const pattern = /[.!?]+/g;
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const next = text[match.index + match[0].length];
    if (next === undefined || /\s/.test(next)) {
      if (match.index > start) ranges.push([start, match.index]);
      start = match.index + match[0].length;
      while (start < text.length && /\s/.test(text[start])) start += 1;
    }
  }
  if (start < text.length) ranges.push([start, text.length]);
  return ranges;
}

/** The sentence sharing the most distinct query tokens; none when there is no overlap. */
function bestSentenceSpan(
  text: string,
  queryTokens: ReadonlySet<string>,
): [number, number] | undefined {
  if (queryTokens.size === 0) return undefined;
  let best: [number, number] | undefined;
  let bestScore = 0;
  for (const range of sentenceRanges(text)) {
    const seen = new Set<string>();
    for (const token of tokenize(text.slice(range[0], range[1]))) {
      if (queryTokens.has(token)) seen.add(token);
    }
    if (seen.size > bestScore) {
      bestScore = seen.size;
      best = range;
    }
  }
  return bestScore > 0 ? best : undefined;
}

/**
 * Policy references for an alert: the rule's mapped clauses (always, in
 * mapping order) plus at most `maxExtras` semantic matches above `threshold`.
 * Each ref carries the span of the sentence that best matches the query so
 * the case screen can highlight it.
 */
export function retrievePolicyRefs(
  ruleId: string,
  queryText: string,
  corpus: Corpus,
  embeddings: Embeddings,
  options: RetrieveOptions = {},
): RetrievedRef[] {
  const threshold = options.threshold ?? SEMANTIC_THRESHOLD;
  const maxExtras = options.maxExtras ?? MAX_SEMANTIC_EXTRAS;

  const mapped = mappedChunkIds(ruleId);
  if (mapped.length === 0) throw new Error(`No policy mapping for rule ${ruleId}`);
  for (const chunkId of mapped) {
    if (!corpus.byChunkId.has(chunkId)) throw new Error(`Mapped chunkId not in corpus: ${chunkId}`);
  }

  const mappedSet = new Set(mapped);
  const query = encodeQuery(queryText, embeddings);
  const candidates: RetrievedRef[] = [];
  if (maxExtras > 0 && query.length > 0) {
    for (const chunkId of Object.keys(embeddings.documents)) {
      if (mappedSet.has(chunkId) || !corpus.byChunkId.has(chunkId)) continue;
      const score = cosineSimilarity(query, embeddings.documents[chunkId]);
      if (score > threshold) {
        candidates.push({ chunkId, reason: "semantic", confidence: Math.min(1, score) });
      }
    }
    candidates.sort(
      (a, b) => b.confidence - a.confidence || (a.chunkId < b.chunkId ? -1 : a.chunkId > b.chunkId ? 1 : 0),
    );
  }

  const queryTokens = new Set(tokenize(queryText));
  return [...mapped.map((chunkId) => ({ chunkId, reason: "mapped" as const, confidence: 1 })), ...candidates.slice(0, maxExtras)].map(
    (ref) => {
      const clause = corpus.byChunkId.get(ref.chunkId);
      const span = clause ? bestSentenceSpan(clause.text, queryTokens) : undefined;
      return span ? { ...ref, highlightSpan: span } : ref;
    },
  );
}
