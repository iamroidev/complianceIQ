/**
 * Shared tokenizer for TF-IDF retrieval. The embeddings script and the
 * runtime query encoder MUST use this exact function, so query and document
 * vectors live in the same space.
 */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "did", "do",
  "does", "for", "from", "had", "has", "have", "he", "her", "his", "if", "in",
  "into", "is", "it", "its", "not", "of", "on", "or", "our", "she", "so",
  "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "to", "was", "we", "were", "what", "when", "which", "who", "will", "with",
  "would", "you", "your",
]);

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g);
  if (!matches) return [];
  return matches.filter((token) => token.length > 1 && !STOPWORDS.has(token));
}
