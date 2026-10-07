/**
 * Pure parsers shared by the corpus loader (runtime) and the embeddings
 * script (build time) so section chunks cannot drift between the two.
 */

const SECTION_HEADING = /^## (\d+)\.\s+(.+)$/gm;
const DOCUMENT_TITLE = /^#\s+(.+)$/m;
const DOCUMENT_VERSION = /^Demo policy document\s+\u00b7\s+version\s+(.+)$/m;

type SectionClauseDraft = {
  chunkId: string;
  documentId: string;
  regulation: string;
  citation: string;
  title: string;
  text: string;
  textKind: "verbatim";
};

export function documentTitle(text: string): string {
  const match = DOCUMENT_TITLE.exec(text);
  if (!match) throw new Error("Document has no '# ' title heading");
  return match[1];
}

export function documentVersion(text: string): string {
  const match = DOCUMENT_VERSION.exec(text);
  return match ? match[1].trim() : "1.0";
}

/** Splits a demo policy document into one clause per `## N. Title` section. */
export function parseSections(docId: string, text: string): SectionClauseDraft[] {
  const headings: { number: number; title: string; start: number; bodyStart: number }[] = [];
  for (const match of text.matchAll(SECTION_HEADING)) {
    headings.push({
      number: Number(match[1]),
      title: match[2].trim(),
      start: match.index ?? 0,
      bodyStart: (match.index ?? 0) + match[0].length,
    });
  }
  if (headings.length === 0) throw new Error(`${docId}: no '## N.' sections found`);

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const body = text.slice(heading.bodyStart, next ? next.start : text.length).trim();
    if (!body) throw new Error(`${docId}: section ${heading.number} is empty`);
    return {
      chunkId: `${docId}#sec-${heading.number}`,
      documentId: docId,
      regulation: "Internal policy",
      citation: `Section ${heading.number}`,
      title: heading.title,
      text: body,
      textKind: "verbatim" as const,
    };
  });
}
