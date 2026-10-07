/**
 * Saved confirmation (DESIGN.md §6.4). Inline row after an action —
 * never a toast. The seal animation is added in the motion milestone.
 */
export function SavedConfirmation({
  time,
  entry,
}: {
  time: string;
  entry: number;
}) {
  return (
    <p
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--verified-bg)",
        color: "var(--verified)",
        fontSize: "var(--fs-label)",
        lineHeight: "18px",
        padding: "6px 10px",
        borderRadius: "var(--r-control)",
        width: "fit-content",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="7"
          cy="7"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4.5 7.2 6.2 9l3.3-3.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Saved to audit record · {time} · Entry {entry}
    </p>
  );
}
