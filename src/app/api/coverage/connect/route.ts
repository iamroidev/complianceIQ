import { NextRequest } from "next/server";
import { z } from "zod";
import { Obligation } from "@/core/types";
import { getRule } from "@/core/engine/rules";
import { formatClock } from "@/lib/format";
import { ApiError, errorResponse, ok, parseOr400, readJson, requireRole } from "../../_http";
import { getState, setRegisters } from "../../_state";

const Body = z.object({
  obligationId: z.string().min(1),
  ruleId: z.string().min(1),
});

/**
 * §7.4 D / §30.3: an officer closes a coverage gap by mapping a rule to the
 * obligation. Coverage itself is computed (computeCoverage), so the durable
 * write is the obligation's ruleIds plus one ledger block — the modal's
 * "Save to audit record" promise.
 */
export async function POST(request: NextRequest) {
  try {
    const role = requireRole(request, "officer", "admin");
    const body = parseOr400(Body, await readJson(request));
    if (!getRule(body.ruleId)) throw new ApiError(400, `Unknown rule: ${body.ruleId}`);

    const state = await getState();
    const existing = state.registers.obligations.find(
      (obligation) => obligation.id === body.obligationId,
    );
    if (!existing) throw new ApiError(404, `Unknown obligation: ${body.obligationId}`);

    const updated = parseOr400(Obligation, { ...existing, ruleIds: [body.ruleId] });
    await setRegisters({
      ...state.registers,
      obligations: state.registers.obligations.map((obligation) =>
        obligation.id === body.obligationId ? updated : obligation,
      ),
    });

    const block = state.ledger.append({
      eventType: "RULE_CONNECTED",
      actor: role,
      payload: {
        obligationId: body.obligationId,
        ruleId: body.ruleId,
        previousRuleIds: existing.ruleIds,
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
