import { NextRequest } from "next/server";
import { errorResponse, ok, requireRole } from "../../_http";
import { resetDemoState } from "../../_state";

/** §9 "Reset demo" (admin): fresh seeded state plus a verified ledger. Memory mode only (documented). */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, "admin");
    const state = await resetDemoState();
    return ok({
      ok: true,
      mode: state.mode,
      asOf: state.clock.now(),
      standingAlerts: state.repo.alerts.list().map((alert) => alert.id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
