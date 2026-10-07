import { NextRequest } from "next/server";
import { runChecks } from "@/core/pipeline/run-checks";
import { errorResponse, ok, requireRole } from "../../_http";
import { alertDepsOf, getState } from "../../_state";

/** §7.3 "Run checks now": state rules at the current clock time (officer/admin). */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, "officer", "admin");
    const state = await getState();
    const outcome = runChecks(
      { asOf: state.clock.now(), registers: state.registers, responseSettings: state.responseSettings },
      alertDepsOf(state),
    );
    return ok(outcome);
  } catch (error) {
    return errorResponse(error);
  }
}
