import { NextRequest } from "next/server";
import { explainAlert } from "@/core/ai/explain";
import { ApiError, errorResponse, ok, paramOf, roleOf, type ParamContext } from "../../../_http";
import { getState } from "../../../_state";

/**
 * §7.4 A per alert: generates the explanation once, stores it, links it on
 * the alert and returns it. Generating is advisory — every role may read it.
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    roleOf(request);
    const id = await paramOf(context, "id");
    const state = await getState();
    const alert = state.repo.alerts.get(id);
    if (!alert) throw new ApiError(404, `Alert not found: ${id}`);

    const existing = state.repo.explanations.byAlert(id)[0];
    if (existing) return ok({ explanation: existing, generated: false });

    const explanation = await explainAlert(alert);
    try {
      state.repo.explanations.add(explanation);
    } catch (error) {
      // A concurrent request (StrictMode double effects) may have stored the
      // same explanation first; that is success, not an error.
      const winner = state.repo.explanations.byAlert(id)[0];
      if (!winner) throw error;
      return ok({ explanation: winner, generated: false });
    }
    state.repo.alerts.update(alert.id, { explanationId: explanation.id });
    return ok({ explanation, generated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
