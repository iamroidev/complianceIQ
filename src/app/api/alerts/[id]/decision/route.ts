import { NextRequest } from "next/server";
import { z } from "zod";
import { recordDecision } from "@/core/pipeline/decide";
import { ApiError, errorResponse, ok, parseOr400, paramOf, readJson, requireRole, type ParamContext } from "../../../_http";
import { alertDepsOf, getState } from "../../../_state";

const Body = z
  .object({
    decision: z.enum(["file", "dismiss", "escalate"]),
    reason: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .refine((body) => body.decision !== "dismiss" || Boolean(body.reason?.trim()), {
    message: "A dismissal requires a reason.",
    path: ["reason"],
  });

/**
 * §8 roles: officers and admins decide; auditors are read-only and get a
 * 403 here (spec acceptance). A dismissal without a reason is a 400.
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    const role = requireRole(request, "officer", "admin");
    const id = await paramOf(context, "id");
    const body = parseOr400(Body, await readJson(request));
    const state = await getState();
    if (!state.repo.alerts.get(id)) throw new ApiError(404, `Alert not found: ${id}`);

    const outcome = recordDecision(
      {
        alertId: id,
        decision: body.decision,
        ...(body.reason ? { reason: body.reason } : {}),
        ...(body.note ? { note: body.note } : {}),
        decider: role,
      },
      alertDepsOf(state),
    );
    return ok(outcome);
  } catch (error) {
    return errorResponse(error);
  }
}
