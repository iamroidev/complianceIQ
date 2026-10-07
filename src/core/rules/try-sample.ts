import { ComplianceEvent, type Registers, type Severity } from "../types";
import type { AnyRuleModule } from "../engine/types";
import { applyRegisterStep, type ScenarioStep } from "../pipeline/scenarios";

export interface SampleLine {
  subjectId: string;
  subjectName: string;
  /** 1-based step index where the rule first fired for this subject. */
  firstFiresAt: number;
  /** Step index where it stopped firing, or null when it still fires. */
  stopsAt: number | null;
  sentence: string;
  severity: Severity;
  riskPoints: number;
  riskReasons: string[];
}

export interface SampleRun {
  leg: "sample" | "control";
  title: string;
  note: string;
  asOf: string;
  stepCount: number;
  /** Results the rule produced at the end of the sample. */
  total: number;
  /** Results still failing when the sample ends. */
  firing: number;
  /** Results that fired during the sample but stopped before it ended. */
  stopped: number;
  lines: SampleLine[];
}

export interface TrySampleInput {
  rule: AnyRuleModule;
  steps: readonly ScenarioStep[];
  leg: "sample" | "control";
  title: string;
  note: string;
  registers: Registers;
  baseAsOf: string;
  params?: Record<string, unknown>;
}

function advance(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
}

/**
 * Runs one rule over a demo scenario's steps on a private copy of the
 * registers and clock, evaluating after every step. Nothing reaches the
 * shared demo state, so the Rules screen can be tried as often as a visitor
 * likes (MASTER 7.8 keeps the scenario runner itself state-changing; this is
 * the read-only half).
 *
 * Each subject keeps the sentence from the step where it first fired and
 * whether it is still firing when the sample ends, which is what makes the
 * negative-control twin readable: "stopped at step 12".
 */
export function tryRuleOnSample(input: TrySampleInput): SampleRun {
  const { rule, steps, leg, title, note, baseAsOf } = input;
  const params = { ...rule.defaultParams, ...(input.params ?? {}) };
  let registers: Registers = structuredClone(input.registers);
  let asOf = baseAsOf;
  const events: ComplianceEvent[] = [];

  interface Open {
    subjectId: string;
    subjectName: string;
    sentence: string;
    severity: Severity;
    riskPoints: number;
    riskReasons: string[];
    firstFiresAt: number;
    stopsAt: number | null;
  }
  const fired = new Map<string, Open>();
  const settled = new Map<string, Open>();
  let total = 0;

  const evaluateAt = (stepIndex: number): void => {
    const ctx = { events, registers, asOf };
    const results = rule.evaluate(ctx, params);
    total = results.length;
    const seen = new Set<string>();
    for (const result of results) {
      const id = result.subject.id;
      seen.add(id);
      if (result.verdict !== "fail") {
        const open = fired.get(id);
        if (open) {
          fired.delete(id);
          settled.set(id, { ...open, stopsAt: stepIndex + 1 });
        }
        continue;
      }
      const open = fired.get(id);
      if (open) continue;
      const risk = rule.riskFactors({ result, ctx, params });
      const top = [...risk].sort((left, right) => right.points - left.points).slice(0, 3);
      fired.set(id, {
        subjectId: id,
        subjectName: result.subject.name,
        sentence: rule.summarize(result),
        severity: rule.severityFor?.(result) ?? rule.meta.severity,
        riskPoints: risk.reduce((sum, factor) => sum + factor.points, 0),
        riskReasons: top.map((factor) => factor.reason),
        firstFiresAt: stepIndex + 1,
        stopsAt: null,
      });
    }
    // A subject that vanished from the results is no longer a concern.
    for (const id of [...fired.keys()]) {
      if (seen.has(id)) continue;
      const open = fired.get(id);
      if (!open) continue;
      fired.delete(id);
      settled.set(id, { ...open, stopsAt: stepIndex + 1 });
    }
  };

  steps.forEach((step, index) => {
    switch (step.kind) {
      case "event":
        events.push(ComplianceEvent.parse(step.event));
        break;
      case "advanceDays":
        asOf = advance(asOf, step.days);
        break;
      case "runChecks":
        break;
      default:
        registers = applyRegisterStep(step, registers, asOf);
    }
    evaluateAt(index);
  });

  const lines: SampleLine[] = [...settled.values(), ...fired.values()]
    .sort((left, right) => left.firstFiresAt - right.firstFiresAt || (left.subjectName < right.subjectName ? -1 : 1))
    .map((open) => ({
      subjectId: open.subjectId,
      subjectName: open.subjectName,
      firstFiresAt: open.firstFiresAt,
      stopsAt: open.stopsAt,
      sentence: open.sentence,
      severity: open.severity,
      riskPoints: open.riskPoints,
      riskReasons: open.riskReasons,
    }));

  return {
    leg,
    title,
    note,
    asOf,
    stepCount: steps.length,
    total,
    firing: fired.size,
    stopped: settled.size,
    lines,
  };
}
