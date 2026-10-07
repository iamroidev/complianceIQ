import { NextRequest } from "next/server";
import { z } from "zod";
import { getScenario, runScenario } from "@/core/pipeline/scenarios";
import { ApiError, errorResponse, ok, paramOf, parseOr400, readJsonOptional, requireRole, type ParamContext } from "../../../_http";
import { beginScenarioState, setRegisters } from "../../../_state";

const Body = z.object({ twin: z.boolean().optional() });

/**
 * §7.8 demo scenario (admin): resets to a clean seeded slate, runs the
 * scenario or its negative-control twin, and returns the observed alerts
 * against the pinned expected set. Memory mode only (documented).
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    requireRole(request, "admin");
    const id = await paramOf(context, "id");
    const body = parseOr400(Body, await readJsonOptional(request));
    const scenario = getScenario(id);
    if (!scenario) throw new ApiError(404, `Unknown scenario: ${id}`);

    const state = await beginScenarioState();
    const result = await runScenario(
      scenario,
      { twin: body.twin === true },
      state.registers,
      { repo: state.repo, ledger: state.ledger, evidence: state.evidence, clock: state.clock },
    );
    await setRegisters(result.registers);

    return ok({
      scenarioId: result.scenarioId,
      title: body.twin === true ? (scenario.twin.title ?? scenario.title) : scenario.title,
      note: body.twin === true ? scenario.twin.note ?? null : scenario.note ?? null,
      twin: result.twin,
      opened: result.opened,
      resolved: result.resolved,
      expected: result.expected,
      matchesExpected: result.matchesExpected,
      asOf: state.clock.now(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
