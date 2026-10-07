export type SourceStatus = "reporting" | "delayed" | "disconnected";

export interface SourceRow {
  id: string;
  name: string;
  /** One plain sentence per column (DESIGN §13). */
  watch: string;
  status: SourceStatus;
  /** Minutes before the demo clock when the source last reported; null = never. */
  minutesAgo: number | null;
}

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  reporting: "Reporting",
  delayed: "Delayed",
  disconnected: "Disconnected",
};

export type SourceTone = "verified" | "attention" | "critical" | "neutral";

export const SOURCE_STATUS_TONE: Record<SourceStatus, SourceTone> = {
  reporting: "neutral",
  delayed: "attention",
  disconnected: "critical",
};

/**
 * §13 detail table. Every row is a demo connection - the app never claims a
 * real integration exists.
 */
export const SOURCE_ROWS: SourceRow[] = [
  {
    id: "src_github",
    name: "GitHub",
    watch: "Commits and the secrets that show up in them.",
    status: "reporting",
    minutesAgo: 2,
  },
  {
    id: "src_identity",
    name: "Identity provider",
    watch: "Sign-ins and access changes for the 9 people on file.",
    status: "reporting",
    minutesAgo: 6,
  },
  {
    id: "src_hospital",
    name: "Hospital records system",
    watch: "Reads of patient records in the demo tenant.",
    status: "delayed",
    minutesAgo: 47,
  },
  {
    id: "src_expense",
    name: "Expense tool",
    watch: "Receipts and expense claims over $250.",
    status: "reporting",
    minutesAgo: 4,
  },
  {
    id: "src_agent",
    name: "Local agent",
    watch: "Collects the fingerprints every other source sends.",
    status: "reporting",
    minutesAgo: 1,
  },
];

/** "4 sources are reporting. 1 needs attention." (DESIGN §13 headline). */
export function sourceHeadline(rows: SourceRow[]): string {
  const reporting = rows.filter((row) => row.status === "reporting").length;
  const attention = rows.length - reporting;
  const first = `${reporting} ${reporting === 1 ? "source is" : "sources are"} reporting.`;
  const second =
    attention === 0
      ? "None need attention."
      : `${attention} ${attention === 1 ? "needs" : "need"} attention.`;
  return `${first} ${second}`;
}

/** The ISO instant of a source's last check, relative to the demo clock. */
export function lastCheckIso(row: SourceRow, asOf: string): string | null {
  if (row.minutesAgo === null) return null;
  return new Date(Date.parse(asOf) - row.minutesAgo * 60_000).toISOString();
}
