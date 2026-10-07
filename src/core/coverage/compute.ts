import type { CoverageItem, IsoUtcMs, Obligation } from "../types";

/** §7.4 D — "recent" default: a passing check from the last 90 days counts. */
export const DEFAULT_CHECK_RECENCY_MS = 90 * 24 * 60 * 60 * 1000;

export interface CoverageOptions {
  obligations: readonly Obligation[];
  /** obligation id → when its rule last passed. Missing means no passing check. */
  passingChecks?: Readonly<Record<string, IsoUtcMs>>;
  asOf: IsoUtcMs;
  recencyMs?: number;
}

/**
 * §7.4 D — coverage: rejected obligations drop out; gaps have no mapped
 * rules; covered = confirmed + rules + a passing check recent as of asOf;
 * everything else with rules is partial. Reason strings are the plain terms
 * the officer reads ("No automated check").
 */
export function computeCoverage(options: CoverageOptions): CoverageItem[] {
  const recencyMs = options.recencyMs ?? DEFAULT_CHECK_RECENCY_MS;
  const asOfMs = Date.parse(options.asOf);
  const items: CoverageItem[] = [];

  for (const obligation of options.obligations) {
    if (obligation.status === "rejected") continue;

    const rules = obligation.ruleIds;
    const passedAt = options.passingChecks?.[obligation.id];
    const passedMs = passedAt !== undefined ? Date.parse(passedAt) : Number.NaN;
    const lastPassedAt =
      passedAt !== undefined && !Number.isNaN(passedMs) && passedMs <= asOfMs
        ? passedAt
        : undefined;
    const recent = lastPassedAt !== undefined && asOfMs - Date.parse(lastPassedAt) <= recencyMs;

    if (rules.length === 0) {
      items.push({
        obligationId: obligation.id,
        status: "gap",
        ruleIds: [],
        ...(lastPassedAt !== undefined ? { lastPassedAt } : {}),
        reason:
          obligation.status === "confirmed"
            ? "No automated check maps to this obligation."
            : "Awaiting confirmation; no automated check maps to this obligation.",
      });
      continue;
    }

    const ruleList = rules.join(", ");
    if (obligation.status !== "confirmed") {
      items.push({
        obligationId: obligation.id,
        status: "partial",
        ruleIds: rules,
        ...(lastPassedAt !== undefined ? { lastPassedAt } : {}),
        reason: `Awaiting confirmation; checked by ${ruleList} once confirmed.`,
      });
    } else if (recent) {
      items.push({
        obligationId: obligation.id,
        status: "covered",
        ruleIds: rules,
        lastPassedAt,
        reason: `Confirmed and checked by ${ruleList}; last passed ${lastPassedAt}.`,
      });
    } else if (lastPassedAt !== undefined) {
      items.push({
        obligationId: obligation.id,
        status: "partial",
        ruleIds: rules,
        lastPassedAt,
        reason: `Checked by ${ruleList}; the last passing check is outside the recent window.`,
      });
    } else {
      items.push({
        obligationId: obligation.id,
        status: "partial",
        ruleIds: rules,
        reason: `Checked by ${ruleList} but no passing check recorded.`,
      });
    }
  }

  return items;
}

/** DESIGN line 283 wording: "X of Y obligations are checked automatically. Z have no check." */
export function coverageHeadline(items: readonly CoverageItem[]): string {
  const total = items.length;
  const gaps = items.filter((item) => item.status === "gap").length;
  const checked = total - gaps;
  return `${checked} of ${total} obligations are checked automatically. ${gaps} have no check.`;
}

/**
 * Conservative derivation shared by GET /api/coverage and the audit pack:
 * an obligation counts as recently checked only when its mapped rules have no
 * open alert and a check run exists — an open alert can only lower, never
 * raise, the reported coverage.
 */
export function derivePassingChecks(
  obligations: readonly Obligation[],
  openRuleIds: ReadonlySet<string>,
  lastCheckAsOf?: IsoUtcMs,
): Record<string, IsoUtcMs> {
  const passing: Record<string, IsoUtcMs> = {};
  if (lastCheckAsOf === undefined) return passing;
  for (const obligation of obligations) {
    if (obligation.ruleIds.length === 0) continue;
    if (obligation.ruleIds.some((ruleId) => openRuleIds.has(ruleId))) continue;
    passing[obligation.id] = lastCheckAsOf;
  }
  return passing;
}
