import { NextRequest } from "next/server";
import { z } from "zod";
import { Obligation, ObligationCadence } from "@/core/types";
import { formatClock } from "@/lib/format";
import { ApiError, errorResponse, ok, paramOf, parseOr400, readJson, requireRole, type ParamContext } from "../../../_http";
import { getState, setRegisters } from "../../../_state";

const Body = z.object({
  action: z.enum(["confirm", "reject", "edit"]),
  patch: z
    .object({
      title: z.string().min(1).optional(),
      dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      ruleIds: z.array(z.string()).optional(),
      cadence: ObligationCadence.optional(),
      ownerId: z.string().optional(),
    })
    .optional(),
});

/**
 * §7.4 C / §8: a person confirms or rejects a proposed obligation (officer/
 * admin only), optionally editing it first. Confirm and reject are ledger
 * blocks; "edit" only adjusts the working proposal — nothing is in the
 * record until the person decides (DESIGN §15.2: "Nothing counts until
 * confirmed").
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    const role = requireRole(request, "officer", "admin");
    const id = await paramOf(context, "id");
    const body = parseOr400(Body, await readJson(request));
    const state = await getState();
    const existing = state.registers.obligations.find((obligation) => obligation.id === id);
    if (!existing) throw new ApiError(404, `Unknown obligation: ${id}`);

    const status =
      body.action === "confirm"
        ? "confirmed"
        : body.action === "reject"
          ? "rejected"
          : existing.status;
    const updated = parseOr400(Obligation, {
      ...existing,
      ...(body.patch ?? {}),
      status,
    });

    await setRegisters({
      ...state.registers,
      obligations: state.registers.obligations.map((obligation) =>
        obligation.id === id ? updated : obligation,
      ),
    });

    if (body.action === "edit") {
      return ok({ obligation: updated });
    }

    const block = state.ledger.append({
      eventType: "OBLIGATION_CONFIRMED",
      actor: role,
      payload: {
        obligationId: id,
        action: body.action,
        ...(body.patch ?? {}),
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
