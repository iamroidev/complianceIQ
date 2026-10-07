/** §7.4 — phrases no AI output may ever contain (validator rejects). */
export const FORBIDDEN_PHRASES = [
  "guilty",
  "committed a crime",
  "compliant with",
  "certified",
  "filed with",
] as const;

const LEGAL_CONCLUSION =
  /\b(illegal|unlawful|liable|prosecut\w*|violates the law|violation of the law|breach of the law)\b/i;

export function findForbiddenPhrases(text: string): string[] {
  return FORBIDDEN_PHRASES.filter((phrase) =>
    new RegExp(`(?:^|\\W)${phrase.replace(/\s+/g, "\\s+")}(?:$|\\W)`, "i").test(text),
  );
}

/** A legal conclusion is only allowed when the paragraph carries a citation. */
export function hasLegalConclusion(text: string): boolean {
  return LEGAL_CONCLUSION.test(text);
}
