import { NextRequest } from "next/server";
import { z } from "zod";
import { Obligation } from "@/core/types";
import { formatClock } from "@/lib/format";
import { ApiError, errorResponse, ok, paramOf, parseOr400, readJson, requireRole, type ParamContext } from "../../../_http";
import { getState, setRegisters } from "../../../_state";

const Body = z.object({
  completedOn: z.string().min(8),
});

/**
 * §7.4 / §12 / DESIGN §15.2: an officer records proof that a deadline was
 * met. The obligation's `lastCompletedOn` moves (DEAD-001 reads it on the
 * next check run) and the completion is appended to the ledger as its own
 * event type, so an auditor sees completions distinctly from confirmations.
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    const role = requireRole(request, "officer", "admin");
    const id = await paramOf(context, "id");
    const body = parseOr400(Body, await readJson(request));

    const completedOn = body.completedOn.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completedOn) || Number.isNaN(Date.parse(`${completedOn}T00:00:00Z`))) {
      throw new ApiError(400, `completedOn must be a calendar date (received: ${body.completedOn}).`);
    }

    const state = await getState();
    const existing = state.registers.obligations.find((obligation) => obligation.id === id);
    if (!existing) throw new ApiError(404, `Unknown obligation: ${id}`);

    const updated = parseOr400(Obligation, { ...existing, lastCompletedOn: completedOn });
    await setRegisters({
      ...state.registers,
      obligations: state.registers.obligations.map((obligation) =>
        obligation.id === id ? updated : obligation,
      ),
    });

    const block = state.ledger.append({
      eventType: "OBLIGATION_COMPLETED",
      actor: role,
      payload: {
        obligationId: id,
        completedOn,
        at: state.clock.now(),
      },
    });

    return ok({
      obligation: updated,
      saved: { time: formatClock(block.timestamp), entry: block.blockIndex },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
