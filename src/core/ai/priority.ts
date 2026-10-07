import type { Alert, IsoUtcMs, PrioritySuggestion } from "../types";
import { PrioritySuggestion as PrioritySuggestionSchema } from "../types";
import { formatShort } from "@/lib/format";
import type { Clock } from "../clock";
import { SystemClock } from "../clock";
import { buildPriorityFacts } from "./facts";
import { buildPriorityPrompt } from "./prompts";
import { loadPriorityFixture } from "./fixtures-loader";
import { resolveAiMode, runAiTask, type AiDeps } from "./generate";
import { RawPriorityOrder, type RawPriorityOrder as RawPriorityOrderType } from "./raw";
import { validatePriorityOrder } from "./validators";

function scoreFallbackOrder(alerts: readonly Alert[]): RawPriorityOrderType {
  const sorted = [...alerts].sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return {
    order: sorted.map((alert) => ({
      alertId: alert.id,
      reason: `Score ${alert.riskScore} (${alert.severity}), review due by ${formatShort(alert.slaDueAt)}.`,
      citedFacts: [alert.summarySentence],
    })),
  };
}

export interface PriorityDeps extends AiDeps {
  clock?: Clock;
  asOf?: IsoUtcMs;
  fixture?: RawPriorityOrderType;
}

/**
 * §7.4 F — suggested order: a ranked advisory list, every alert exactly once,
 * reasons and citedFacts drawn from the supplied facts. Fallback (and any
 * generatedBy "template") becomes "score-order": score desc, SLA asc, id asc.
 * Scores, severities and SLAs are never modified.
 */
export async function suggestOrder(
  alerts: readonly Alert[],
  deps: PriorityDeps = {},
): Promise<PrioritySuggestion> {
  const clock = deps.clock ?? new SystemClock();
  const asOf = deps.asOf ?? clock.now();
  const facts = buildPriorityFacts(alerts, asOf);
  const prompt = buildPriorityPrompt(facts);
  const fixture =
    deps.fixture !== undefined ? deps.fixture : loadPriorityFixture(alerts.map((a) => a.id));

  const { output, generatedBy } = await runAiTask<RawPriorityOrderType>({
    mode: deps.mode ?? resolveAiMode(),
    prompt,
    parse: (raw) => RawPriorityOrder.parse(JSON.parse(raw)),
    validate: (candidate) => validatePriorityOrder(candidate.order, { alerts, factsText: facts }),
    loadFixture: () => fixture,
    fallback: () => scoreFallbackOrder(alerts),
    client: deps.client,
  });

  return PrioritySuggestionSchema.parse({
    id: `prs_${[...alerts].map((a) => a.id).sort().join("-")}`,
    generatedAt: asOf,
    order: output.order.map((entry, index) => ({
      alertId: entry.alertId,
      rank: index + 1,
      reason: entry.reason,
      citedFacts: entry.citedFacts,
    })),
    generatedBy: generatedBy === "template" ? "score-order" : generatedBy,
  });
}
