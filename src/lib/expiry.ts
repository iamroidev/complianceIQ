/**
 * Expiry wording for the people and vendor registers (DESIGN §15.2):
 * "Valid" · "Expires in 12 days" · "Expired 19 days ago". Dates are compared
 * as calendar days against the demo clock, never rounded with the clock time.
 */

import type { Person } from "@/core/types";

export type ExpiryState = "valid" | "soon" | "expired" | "none";
export type ExpiryTone = "verified" | "attention" | "critical" | "neutral";

export interface ExpiryStatus {
  state: ExpiryState;
  word: string;
  tone: ExpiryTone;
}

/** Person status words; active stays out of the way and reads as no word. */
export const PERSON_STATUS_WORD: Record<Person["status"], string | null> = {
  active: null,
  leave: "On leave",
  terminated: "Terminated",
};

const DAY_MS = 86_400_000;
const SOON_DAYS = 30;

/** Calendar days from the demo clock's day to `dateOnly` (negative = past). */
export function daysUntil(asOf: string, dateOnly: string): number {
  return Math.round((Date.parse(dateOnly) - Date.parse(asOf.slice(0, 10))) / DAY_MS);
}

export function expiryStatus(asOf: string, expiresOn?: string): ExpiryStatus {
  if (!expiresOn) return { state: "none", word: "No expiry date", tone: "neutral" };
  const days = daysUntil(asOf, expiresOn);
  if (days < 0) {
    const n = Math.abs(days);
    return {
      state: "expired",
      word: n === 1 ? "Expired 1 day ago" : `Expired ${n} days ago`,
      tone: "critical",
    };
  }
  if (days === 0) return { state: "soon", word: "Expires today", tone: "attention" };
  if (days <= SOON_DAYS) {
    return { state: "soon", word: `Expires in ${days} ${days === 1 ? "day" : "days"}`, tone: "attention" };
  }
  return { state: "valid", word: "Valid", tone: "verified" };
}

function stateRank(state: ExpiryState): number {
  if (state === "expired") return 0;
  if (state === "soon") return 1;
  if (state === "valid") return 2;
  return 3;
}

/** Sort what needs attention first (expired, soon, valid); ties by date. */
export function byExpiry(asOf: string, a: { expiresOn?: string }, b: { expiresOn?: string }): number {
  const rank =
    stateRank(expiryStatus(asOf, a.expiresOn).state) - stateRank(expiryStatus(asOf, b.expiresOn).state);
  if (rank !== 0) return rank;
  return (a.expiresOn ?? "9999-99-99").localeCompare(b.expiresOn ?? "9999-99-99");
}

/**
 * The second sentence of the register headlines (DESIGN §15.2): how much is
 * at risk, with the noun repeated so the count is never ambiguous.
 */
export function riskPhrase(
  soon: number,
  expired: number,
  noun: { one: string; many: string },
): string {
  if (soon === 0 && expired === 0) return "All are valid.";
  const parts: string[] = [];
  if (soon > 0) {
    const count = soon === 1 ? `1 ${noun.one}` : `${soon} ${noun.many}`;
    parts.push(`${count} expire${soon === 1 ? "s" : ""} within 30 days`);
  }
  if (expired > 0) parts.push(`${expired} already expired`);
  return `${parts.join(", ")}.`;
}
