import { NextRequest } from "next/server";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/** §8: everyone reads the obligation register. */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    return ok({ obligations: state.registers.obligations, asOf: state.clock.now() });
  } catch (error) {
    return errorResponse(error);
  }
}
