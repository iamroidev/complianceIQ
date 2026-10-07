import { NextRequest } from "next/server";
import { z } from "zod";
import { getRule } from "@/core/engine/rules";
import { loadScenarios } from "@/core/pipeline/scenarios";
import { tryRuleOnSample } from "@/core/rules/try-sample";
import {
  ApiError,
  errorResponse,
  ok,
  paramOf,
  parseOr400,
  readJsonOptional,
  roleOf,
  type ParamContext,
} from "../../../_http";
import { getState } from "../../../_state";

const Body = z.object({
  leg: z.enum(["sample", "control"]).default("sample"),
  params: z.record(z.string(), z.unknown()).optional(),
});

function coerceParams(defaults: Record<string, unknown>, raw: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw)) {
    const target = defaults[key];
    if (target === undefined || value === null || value === "") continue;
    if (typeof target === "number") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) out[key] = parsed;
    } else if (typeof target === "string") {
      out[key] = String(value);
    } else if (Array.isArray(target)) {
      if (Array.isArray(value)) {
        out[key] = value.map(String).filter(Boolean);
      } else if (typeof value === "string") {
        out[key] = value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
      }
    }
  }
  return out;
}

/**
 * "Try it on a sample" (DESIGN §7): runs one rule over the demo scenario's
 * steps - or its negative-control twin - on a private copy of the registers
 * and clock, so nothing in the shared demo state moves. Every role may try a
 * rule; the rule itself stays the only thing that decides the verdict.
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    roleOf(request);
    const ruleId = await paramOf(context, "id");
    const rule = getRule(ruleId);
    if (!rule) throw new ApiError(404, `Unknown rule: ${ruleId}`);
    const body = parseOr400(Body, await readJsonOptional(request));

    const scenario = loadScenarios().find((candidate) => candidate.ruleId === ruleId);
    if (!scenario) throw new ApiError(404, `No sample is on file for ${ruleId}.`);

    const control = body.leg === "control";
    const state = await getState();
    const run = tryRuleOnSample({
      rule,
      steps: control ? scenario.twin.steps : scenario.steps,
      leg: body.leg,
      title: control ? (scenario.twin.title ?? scenario.title) : scenario.title,
      note: control ? (scenario.twin.note ?? "") : (scenario.note ?? ""),
      registers: state.registers,
      baseAsOf: state.clock.now(),
      params: coerceParams(rule.defaultParams, body.params),
    });

    return ok({ ruleId, scenarioId: scenario.id, ...run });
  } catch (error) {
    return errorResponse(error);
  }
}
