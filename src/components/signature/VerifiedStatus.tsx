/**
 * Verified status (DESIGN.md §5). Lives in the top bar: small green dot,
 * plain text, with a "Check now" link. Green means verified only.
 */
export function VerifiedStatus({
  onCheck,
}: {
  onCheck?: () => void;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "var(--fs-label)",
        lineHeight: "18px",
        color: "var(--text-2)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "var(--verified)",
        }}
      />
      Records verified
      <button
        type="button"
        onClick={onCheck}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "var(--accent)",
          font: "inherit",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          cursor: "pointer",
        }}
      >
        Check now
      </button>
    </span>
  );
}
