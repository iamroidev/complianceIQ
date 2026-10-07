/**
 * §7.4 C: a quote must be a substring of the document after whitespace
 * normalisation, so line re-wrapping in a model or fixture cannot fail an
 * otherwise exact quote.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isQuoteInDocument(quote: string, documentText: string): boolean {
  const normalizedQuote = normalizeWhitespace(quote);
  if (normalizedQuote.length === 0) return false;
  return normalizeWhitespace(documentText).includes(normalizedQuote);
}

/** True when `fact` appears in `factsText`, ignoring case and whitespace shape. */
export function isFactInFacts(fact: string, factsText: string): boolean {
  const normalizedFact = normalizeWhitespace(fact).toLowerCase();
  if (normalizedFact.length === 0) return false;
  return normalizeWhitespace(factsText).toLowerCase().includes(normalizedFact);
}
