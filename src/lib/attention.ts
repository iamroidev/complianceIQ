import type { Alert } from "@/core/types";
import { timeLeft } from "./format";

/** Alerts a person still has to act on (open, in review, escalated). */
export const ATTENTION_STATUSES = new Set<Alert["status"]>(["open", "in_review", "escalated"]);

/** The one place alert status becomes UI words (DESIGN §9: sentence case). */
export const STATUS_WORDS: Record<Alert["status"], string> = {
  open: "Open",
  in_review: "In review",
  filed: "Report filed",
  dismissed: "Dismissed",
  escalated: "Escalated",
  resolved: "Closed",
};

const FOUR_HOURS = 4 * 60 * 60 * 1000;

export interface AttentionParts {
  /** How many alerts need attention. */
  count: number;
  /** How many are already past their response time. */
  overdue: number;
  /** How many are due within the next 4 hours. */
  dueSoon: number;
}

export function attentionParts(attention: Alert[], asOf: string): AttentionParts {
  let overdue = 0;
  let dueSoon = 0;
  for (const alert of attention) {
    const left = timeLeft(asOf, alert.slaDueAt);
    if (left.overdue) {
      overdue += 1;
    } else if (Date.parse(alert.slaDueAt) - Date.parse(asOf) <= FOUR_HOURS) {
      dueSoon += 1;
    }
  }
  return { count: attention.length, overdue, dueSoon };
}

/** The one-sentence headline shared by Alerts and Overview (DESIGN §7). */
export function headlineFor(attention: Alert[], asOf: string): string {
  const { count, overdue, dueSoon } = attentionParts(attention, asOf);
  if (count === 0) return "Nothing needs attention.";
  const plural = count === 1 ? "" : "s";
  const verb = count === 1 ? "needs" : "need";
  let sentence = `${count} alert${plural} ${verb} attention. `;
  if (overdue > 0) {
    sentence += `${overdue === 1 ? "1 is" : `${overdue} are`} overdue. `;
  }
  sentence +=
    dueSoon > 0
      ? `${dueSoon === 1 ? "1 is" : `${dueSoon} are`} due within 4 hours.`
      : "None are due within 4 hours.";
  return sentence.trim();
}
