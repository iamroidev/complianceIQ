import { NextRequest } from "next/server";
import { ApiError, errorResponse, ok, paramOf, roleOf, type ParamContext } from "../../_http";
import { getState } from "../../_state";

/** One alert with its generated explanation and drafts (all roles may read). */
export async function GET(request: NextRequest, context: ParamContext<"id">) {
  try {
    roleOf(request);
    const id = await paramOf(context, "id");
    const state = await getState();
    const alert = state.repo.alerts.get(id);
    if (!alert) throw new ApiError(404, `Alert not found: ${id}`);
    return ok({
      alert,
      explanation: state.repo.explanations.byAlert(id)[0] ?? null,
      drafts: state.repo.drafts.byAlert(id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
