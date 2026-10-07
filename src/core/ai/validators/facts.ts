/**
 * Number tokens normalised so "USD 9,800.00", "9,800" and "9800" compare
 * equal — the fact check must not reject honest formatting differences.
 */
export function extractNumbers(text: string): string[] {
  const numbers: string[] = [];
  for (const match of text.matchAll(/[0-9][0-9,]*(?:\.[0-9]+)?/g)) {
    numbers.push(String(Number(match[0].replace(/,/g, ""))));
  }
  return numbers;
}

/**
 * Capitalised words that are NOT sentence openers — sentence-initial words
 * are ordinary vocabulary ("Finding:", "Review..."), so only mid-sentence
 * capitals can be person, vendor or organisation names.
 */
export function extractNameCandidates(text: string): string[] {
  const candidates: string[] = [];
  const pattern = /\b[A-Z][a-z]{2,}\b/g;
  for (const match of text.matchAll(pattern)) {
    const before = text.slice(0, match.index ?? 0).replace(/\s+$/, "");
    if (before.length === 0) continue;
    if (/[.!?]["')\]]?$/.test(before)) continue;
    candidates.push(match[0]);
  }
  return candidates;
}

export interface FactsCheck {
  fabricatedNumbers: string[];
  fabricatedNames: string[];
}

/** §7.4: numbers and names in AI text must appear in the supplied facts. */
export function checkFacts(text: string, factsText: string): FactsCheck {
  const allowed = new Set(extractNumbers(factsText));
  const haystack = factsText.toLowerCase();
  return {
    fabricatedNumbers: [...new Set(extractNumbers(text).filter((n) => !allowed.has(n)))].sort(),
    fabricatedNames: [
      ...new Set(
        extractNameCandidates(text).filter((word) => !haystack.includes(word.toLowerCase())),
      ),
    ].sort(),
  };
}
