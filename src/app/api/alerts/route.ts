import { NextRequest } from "next/server";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/** Every role reads alerts (§8). Optional ?status=open|in_review|filed|dismissed|escalated|resolved. */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const status = new URL(request.url).searchParams.get("status");
    const alerts = state.repo.alerts.list();
    return ok({
      alerts: status ? alerts.filter((alert) => alert.status === status) : alerts,
      asOf: state.clock.now(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
