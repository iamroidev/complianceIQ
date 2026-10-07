import { NextRequest } from "next/server";
import { suggestOrder } from "@/core/ai/priority";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/** §7.4 F suggested order (every role reads; advisory only — scores and SLAs never change). */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const open = state.repo.alerts
      .list()
      .filter((alert) => alert.status === "open" || alert.status === "in_review");
    if (open.length === 0) return ok({ suggestion: null, alerts: [] });

    const suggestion = await suggestOrder(open, { clock: state.clock });
    if (!state.repo.prioritySuggestions.get(suggestion.id)) {
      state.repo.prioritySuggestions.add(suggestion);
    }
    return ok({ suggestion, alerts: open });
  } catch (error) {
    return errorResponse(error);
  }
}
