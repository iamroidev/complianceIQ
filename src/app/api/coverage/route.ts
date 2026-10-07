import { NextRequest } from "next/server";
import { coverageHeadline, computeCoverage, derivePassingChecks } from "@/core/coverage/compute";
import { suggestGap } from "@/core/ai/gap-suggest";
import type { CoverageItem, Obligation } from "@/core/types";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/**
 * §7.4 D coverage (every role reads; ?suggest=true adds the advisory gap
 * suggestions from §7.4 E). Passing checks come from derivePassingChecks —
 * an open alert can only lower, never raise, the reported coverage.
 */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const obligations = state.registers.obligations;
    const openAlerts = state.repo.alerts.list().filter((alert) => alert.status === "open");
    const checkRuns = state.repo.checkRuns.list();
    const lastCheck = checkRuns[checkRuns.length - 1];

    const passingChecks = derivePassingChecks(
      obligations,
      new Set(openAlerts.map((alert) => alert.ruleId)),
      lastCheck?.asOf,
    );

    const items = computeCoverage({ obligations, passingChecks, asOf: state.clock.now() });
    const payload: Record<string, unknown> = {
      items,
      headline: coverageHeadline(items),
      asOf: state.clock.now(),
    };

    const wantsSuggestions = new URL(request.url).searchParams.get("suggest") === "true";
    if (wantsSuggestions) {
      const byId = new Map<string, Obligation>(obligations.map((obligation) => [obligation.id, obligation]));
      const suggestions = [];
      for (const item of items as CoverageItem[]) {
        if (item.status !== "gap") continue;
        const obligation = byId.get(item.obligationId);
        if (!obligation) continue;
        suggestions.push(await suggestGap(obligation));
      }
      payload["suggestions"] = suggestions;
    }

    return ok(payload);
  } catch (error) {
    return errorResponse(error);
  }
}
