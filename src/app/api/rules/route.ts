import { NextRequest } from "next/server";
import { TIER1_RULES } from "@/core/engine/rules";
import { loadScenarios } from "@/core/pipeline/scenarios";
import { plainDescription, stepLabel, type RuleCard } from "@/lib/rule-copy";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/**
 * Rule catalogue for the Rules screen (DESIGN §7): one card per Tier 1 rule
 * with its plain description, its parameters and the two sample legs (the
 * demo scenario and its negative-control twin).
 */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const scenarios = loadScenarios();

    const rules: RuleCard[] = TIER1_RULES.map((rule) => {
      const scenario = scenarios.find((candidate) => candidate.ruleId === rule.meta.id);
      const leg = (which: "sample" | "control") => {
        if (!scenario) return null;
        const steps = which === "control" ? scenario.twin.steps : scenario.steps;
        return {
          scenarioId: scenario.id,
          title: which === "control" ? (scenario.twin.title ?? scenario.title) : scenario.title,
          note: which === "control" ? (scenario.twin.note ?? "") : (scenario.note ?? ""),
          steps: steps.map((step) => ({ kind: step.kind, label: stepLabel(step, state.registers) })),
        };
      };
      return {
        id: rule.meta.id,
        name: rule.meta.name,
        plainDescription: plainDescription(rule.meta.id, rule.meta.description),
        description: rule.meta.description,
        domain: rule.meta.domain,
        severity: rule.meta.severity,
        kind: rule.kind,
        dossier: rule.meta.dossier,
        defaultParams: rule.defaultParams,
        sample: leg("sample"),
        control: leg("control"),
      };
    });

    return ok({ rules });
  } catch (error) {
    return errorResponse(error);
  }
}
