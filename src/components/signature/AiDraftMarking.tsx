/**
 * AI-assisted marking (DESIGN.md §6.5). A thin green-grey left rule and a
 * small label. The label disappears once the officer edits the paragraph.
 * Paragraphs written from a template (not AI) show "Written from template"
 * instead (MASTER AI boundary) and keep no AI cue.
 */
export function AiDraftMarking({
  children,
  edited = false,
  source = "ai",
}: {
  children: React.ReactNode;
  edited?: boolean;
  source?: "ai" | "template";
}) {
  if (edited) {
    return <div>{children}</div>;
  }

  const isAi = source === "ai";

  return (
    <div style={{ position: "relative", paddingLeft: isAi ? "16px" : "0" }}>
      {isAi && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "2px",
            background: "var(--verified)",
            opacity: 0.45,
            borderRadius: "1px",
          }}
        />
      )}
      <p
        style={{
          fontSize: "var(--fs-label)",
          lineHeight: "18px",
          color: "var(--text-3)",
          marginBottom: "6px",
        }}
      >
        {isAi ? "Drafted by AI, review before filing" : "Written from template"}
      </p>
      {children}
    </div>
  );
}
