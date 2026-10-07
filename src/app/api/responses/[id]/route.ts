import { NextRequest } from "next/server";
import { z } from "zod";
import { RESPONSE_CATALOG_IDS, ResponseMode } from "@/core/responses/response-rules";
import {
  ApiError,
  errorResponse,
  ok,
  paramOf,
  parseOr400,
  readJson,
  requireRole,
  type ParamContext,
} from "../../_http";
import { getState, persistAppState } from "../../_state";

const Body = z.object({ mode: ResponseMode });

/**
 * §7.9 / MASTER §8: response modes belong to the admin role. The mode is
 * settings state, not a ledger event - executions and reversals are what
 * get recorded.
 */
export async function PATCH(request: NextRequest, context: ParamContext<"id">) {
  try {
    requireRole(request, "admin");
    const id = await paramOf(context, "id");
    if (!(RESPONSE_CATALOG_IDS as readonly string[]).includes(id)) {
      throw new ApiError(404, `Response not found: ${id}`);
    }
    const body = parseOr400(Body, await readJson(request));
    const state = await getState();
    state.responseSettings[id as (typeof RESPONSE_CATALOG_IDS)[number]] = body.mode;
    await persistAppState();
    return ok({
      id,
      mode: body.mode,
      settings: state.responseSettings,
      live: process.env.RESPONSES_LIVE === "true",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
