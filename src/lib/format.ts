/**
 * Shared formatting for product screens. Times follow DESIGN.md §9:
 * "Mar 14, 09:12" in the UI, full ISO timestamp on hover, UTC, never rounded.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mar 10, 09:00" - the everyday short form (UTC). */
export function formatShort(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${hh}:${mm}`;
}

/** "Mar 10, 2026" - date without a clock reading. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** "Mar 2026" - month and year, for grouping dates (UTC). */
export function formatMonth(iso: string): string {
  const date = new Date(iso);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "14:05" - clock time only, for saved confirmations and timeline entries. */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * "2 min ago" / "1 hr ago" / "3 days ago" - how long before `nowIso` the
 * event happened, for "last check" style columns. ISO on hover stays the
 * caller's job (DESIGN §9: relative in the UI, full timestamp on hover).
 */
export function timeAgo(iso: string, nowIso: string): string {
  const minutes = Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export interface TimeLeft {
  /** "3h 20m left" / "45m left" / "2h overdue" / "Due now". */
  text: string;
  overdue: boolean;
  dueNow: boolean;
  /** Remaining share of the response window, 0-1 (for the inline bar). */
  fraction: number;
}

/**
 * Time left until `to`, measured from `from` (both ISO, UTC). `windowMs` is
 * the full response window the bar measures against (alert SLA).
 */
export function timeLeft(from: string, to: string, windowMs?: number): TimeLeft {
  const due = Date.parse(to);
  const now = Date.parse(from);
  const diff = due - now;
  const window = windowMs && windowMs > 0 ? windowMs : Math.max(diff, 1);
  const total = Math.max(diff, 0);
  if (diff <= 0) {
    const abs = Math.abs(diff);
    if (abs < 60_000) return { text: "Due now", overdue: true, dueNow: true, fraction: 0 };
    const hours = Math.floor(abs / 3_600_000);
    const minutes = Math.floor((abs % 3_600_000) / 60_000);
    const text = hours > 0 ? `${hours}h ${minutes}m overdue` : `${minutes}m overdue`;
    return { text, overdue: true, dueNow: false, fraction: 0 };
  }
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const text = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  return { text, overdue: false, dueNow: false, fraction: total / window };
}

/** "9,800.00" - grouped, two decimals (pair with the currency word in copy). */
export { formatUsd, formatLimit } from "@/core/engine/format";
