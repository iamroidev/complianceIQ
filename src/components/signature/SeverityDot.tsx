import type { Severity } from "@/core/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        color: "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: SEVERITY_COLOR[severity],
          flexShrink: 0,
        }}
      />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function StatusDot({
  label,
  tone,
}: {
  label: string;
  tone: "verified" | "attention" | "critical" | "neutral";
}) {
  const color =
    tone === "verified"
      ? "var(--verified)"
      : tone === "critical"
        ? "var(--critical)"
        : tone === "attention"
          ? "var(--high)"
          : "var(--low)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
