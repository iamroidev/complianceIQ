import { NextRequest } from "next/server";
import { z } from "zod";
import { ComplianceEvent } from "@/core/types";
import { processEvent } from "@/core/pipeline/process-event";
import { errorResponse, ok, parseOr400, readJson, requireRole } from "../_http";
import { alertDepsOf, getState } from "../_state";

const Body = z.object({ event: z.unknown() });

/** §7.2 pipeline over HTTP: validate, store, alert, explain, respond. Idempotent per event id. */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, "officer", "admin");
    const body = parseOr400(Body, await readJson(request));
    const event = parseOr400(ComplianceEvent, body.event);
    const state = await getState();
    const outcome = await processEvent(
      { event, registers: state.registers, responseSettings: state.responseSettings },
      alertDepsOf(state),
    );
    return ok(outcome);
  } catch (error) {
    return errorResponse(error);
  }
}
