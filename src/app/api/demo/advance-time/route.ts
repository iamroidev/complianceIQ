import { NextRequest } from "next/server";
import { z } from "zod";
import { runChecks } from "@/core/pipeline/run-checks";
import { errorResponse, ok, parseOr400, readJson, requireRole } from "../../_http";
import { alertDepsOf, getState, persistAppState } from "../../_state";

const Body = z.object({ days: z.number().int().min(1).max(3650) });

/** §7.3 time travel (admin): move the FakeClock forward and run checks. */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, "admin");
    const body = parseOr400(Body, await readJson(request));
    const state = await getState();
    state.clock.advanceDays(body.days);
    await persistAppState();
    const outcome = runChecks(
      { asOf: state.clock.now(), registers: state.registers, responseSettings: state.responseSettings },
      alertDepsOf(state),
    );
    return ok({ days: body.days, asOf: state.clock.now(), ...outcome });
  } catch (error) {
    return errorResponse(error);
  }
}
