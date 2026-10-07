/**
 * Policy reference note (DESIGN.md §6.2). Marginal "Why this applies" notes
 * beside the report draft: clause name, a one-line plain summary, and the
 * matching sentence highlighted.
 */
export function PolicyNote({
  clauseName,
  citation,
  summary,
  highlight,
  basis,
}: {
  /** Clause or article name. */
  clauseName: string;
  /** Where it sits, e.g. "31 CFR § 1020.320" or a document title. */
  citation: string;
  /** One plain sentence saying what the clause asks for. */
  summary: string;
  /** The sentence from the policy that matches this case, highlighted. */
  highlight?: string;
  /** Why this reference is here: "Cited by the rule" / "Matches the wording". */
  basis?: string;
}) {
  return (
    <aside className="note" aria-label={`Why this applies: ${clauseName}`}>
      <p className="note-title">Why this applies</p>
      <p className="note-meta">
        {clauseName}
        {citation ? ` · ${citation}` : ""}
        {basis ? ` · ${basis}` : ""}
      </p>
      <p className="note-summary">
        {summary}
        {highlight && highlight.trim() !== summary.trim() && (
          <>
            {" "}
            <span className="hl">“{highlight}”</span>
          </>
        )}
      </p>
    </aside>
  );
}
