import type { Corpus } from "./corpus";

/**
 * Checks that every cited chunk id exists in the corpus. Used by the AI
 * validators so generated text can never reference a fabricated clause
 * (MASTER §7.4, §11).
 */
export function validateCitations(
  chunkIds: string[],
  corpus: Corpus,
): { ok: boolean; unknown: string[] } {
  const unknown = [...new Set(chunkIds.filter((id) => !corpus.byChunkId.has(id)))].sort();
  return { ok: unknown.length === 0, unknown };
}
