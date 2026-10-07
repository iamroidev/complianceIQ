import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { FakeClock } from "../clock";
import { utcDay } from "../engine/format";
import type { Registers } from "../types";
import type { AlertDeps } from "./decide";
import { processEvent } from "./process-event";
import { runChecks, type RunChecksOutcome } from "./run-checks";

const EventStep = z.object({
  kind: z.literal("event"),
  event: z.unknown(),
});

const AdvanceDaysStep = z.object({
  kind: z.literal("advanceDays"),
  days: z.number().int().positive(),
});

const RunChecksStep = z.object({ kind: z.literal("runChecks") });

const UpsertCertificationStep = z.object({
  kind: z.literal("upsertCertification"),
  personId: z.string().min(1),
  certType: z.string().min(1),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const UpsertVendorDocumentStep = z.object({
  kind: z.literal("upsertVendorDocument"),
  vendorId: z.string().min(1),
  documentType: z.enum(["soc2_report", "dpa", "insurance", "pen_test", "contract"]),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const CompleteObligationStep = z.object({
  kind: z.literal("completeObligation"),
  obligationId: z.string().min(1),
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const Step = z.discriminatedUnion("kind", [
  EventStep,
  AdvanceDaysStep,
  RunChecksStep,
  UpsertCertificationStep,
  UpsertVendorDocumentStep,
  CompleteObligationStep,
]);
export type ScenarioStep = z.infer<typeof Step>;

const ExpectedAlert = z.object({ ruleId: z.string().min(1), subjectId: z.string().min(1) });
const Expected = z.object({
  opened: z.array(ExpectedAlert),
  resolved: z.array(ExpectedAlert),
});
export type ScenarioExpected = z.infer<typeof Expected>;

const ScenarioLeg = z.object({
  title: z.string().min(1).optional(),
  note: z.string().optional(),
  steps: z.array(Step).min(1),
  expected: Expected,
});

export const Scenario = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  ruleId: z.string().min(1),
  domain: z.string().min(1),
  note: z.string().optional(),
  steps: z.array(Step).min(1),
  expected: Expected,
  twin: ScenarioLeg,
});
export type Scenario = z.infer<typeof Scenario>;

function scenarioDir(): string {
  return join(process.cwd(), "src", "data", "scenarios");
}

export function loadScenarios(): Scenario[] {
  const dir = scenarioDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => Scenario.parse(JSON.parse(readFileSync(join(dir, file), "utf8"))));
}

export function getScenario(id: string): Scenario | undefined {
  return loadScenarios().find((scenario) => scenario.id === id);
}

export interface ScenarioRuntime {
  repo: AlertDeps["repo"];
  ledger: AlertDeps["ledger"];
  evidence: AlertDeps["evidence"];
  clock: FakeClock;
}

export interface ScenarioAlertRef {
  ruleId: string;
  subjectId: string;
  severity?: string;
  alertId?: string;
}

export interface ScenarioRunResult {
  scenarioId: string;
  twin: boolean;
  opened: ScenarioAlertRef[];
  resolved: ScenarioAlertRef[];
  registers: Registers;
  expected: ScenarioExpected;
  matchesExpected: boolean;
}

function expectedKeys(alerts: readonly ScenarioAlertRef[]): string[] {
  return alerts
    .map((alert) => `${alert.ruleId}::${alert.subjectId}`)
    .sort();
}

function sameKeys(left: readonly ScenarioAlertRef[], right: readonly ScenarioAlertRef[]): boolean {
  const a = expectedKeys(left);
  const b = expectedKeys(right);
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

function upsertCertification(registers: Registers, step: z.infer<typeof UpsertCertificationStep>): Registers {
  let found = false;
  const certifications = registers.certifications.map((certification) => {
    if (certification.personId !== step.personId || certification.type !== step.certType) {
      return certification;
    }
    found = true;
    return { ...certification, issuedOn: step.issuedOn, expiresOn: step.expiresOn };
  });
  if (!found) {
    certifications.push({
      id: `cert_${step.personId}_${step.certType.toLowerCase().replace(/\s+/g, "_")}`,
      personId: step.personId,
      type: step.certType,
      issuedOn: step.issuedOn,
      expiresOn: step.expiresOn,
    });
  }
  return { ...registers, certifications };
}

function upsertVendorDocument(registers: Registers, step: z.infer<typeof UpsertVendorDocumentStep>): Registers {
  let found = false;
  const vendors = registers.vendors.map((vendor) => {
    if (vendor.id !== step.vendorId) return vendor;
    found = true;
    let matched = false;
    const documents = vendor.documents.map((document) => {
      if (document.type !== step.documentType) return document;
      matched = true;
      return { ...document, validFrom: step.validFrom, expiresOn: step.expiresOn };
    });
    if (!matched) {
      documents.push({ type: step.documentType, validFrom: step.validFrom, expiresOn: step.expiresOn });
    }
    return { ...vendor, documents };
  });
  if (!found) throw new Error(`Unknown vendor in scenario step: ${step.vendorId}`);
  return { ...registers, vendors };
}

/**
 * Applies the register-rewriting steps to a caller-supplied copy of the
 * registers. The rule test harness needs this without touching the demo
 * state, so the three rewrites live here rather than inside runScenario.
 */
export function applyRegisterStep(
  step: ScenarioStep,
  registers: Registers,
  asOf: string,
): Registers {
  switch (step.kind) {
    case "upsertCertification":
      return upsertCertification(registers, step);
    case "upsertVendorDocument":
      return upsertVendorDocument(registers, step);
    case "completeObligation":
      return completeObligation(registers, step, asOf);
    default:
      return registers;
  }
}

function completeObligation(
  registers: Registers,
  step: z.infer<typeof CompleteObligationStep>,
  asOf: string,
): Registers {
  let found = false;
  const obligations = registers.obligations.map((obligation) => {
    if (obligation.id !== step.obligationId) return obligation;
    found = true;
    return { ...obligation, lastCompletedOn: step.completedOn ?? utcDay(asOf) };
  });
  if (!found) throw new Error(`Unknown obligation in scenario step: ${step.obligationId}`);
  return { ...registers, obligations };
}

/**
 * Runs a demo scenario (MASTER §7.8) or its negative-control twin on the
 * caller's fresh runtime: event steps go through process-event, time steps
 * move the FakeClock and run checks, register steps rewrite registers
 * immutably (an explicit runChecks step makes the check visible). The result
 * is compared against the scenario's pinned expected set — the twin must
 * open nothing.
 */
export async function runScenario(
  scenario: Scenario,
  options: { twin?: boolean },
  registers: Registers,
  deps: ScenarioRuntime,
): Promise<ScenarioRunResult> {
  const leg = options.twin ? scenario.twin : scenario;
  const alertDeps: AlertDeps = {
    repo: deps.repo,
    ledger: deps.ledger,
    evidence: deps.evidence,
    clock: deps.clock,
  };

  const opened: ScenarioAlertRef[] = [];
  const resolved: ScenarioAlertRef[] = [];
  let current = registers;

  const noteRun = (outcome: RunChecksOutcome): void => {
    for (const alert of outcome.opened) {
      opened.push({ ruleId: alert.ruleId, subjectId: alert.subject.id, severity: alert.severity, alertId: alert.id });
    }
    for (const alert of outcome.resolved) {
      resolved.push({ ruleId: alert.ruleId, subjectId: alert.subject.id, alertId: alert.id });
    }
  };

  for (const step of leg.steps) {
    switch (step.kind) {
      case "event": {
        const outcome = await processEvent({ event: step.event, registers: current }, alertDeps);
        for (const alert of outcome.alerts) {
          opened.push({ ruleId: alert.ruleId, subjectId: alert.subject.id, severity: alert.severity, alertId: alert.id });
        }
        break;
      }
      case "advanceDays":
        deps.clock.advanceDays(step.days);
        noteRun(runChecks({ asOf: deps.clock.now(), registers: current }, alertDeps));
        break;
      case "runChecks":
        noteRun(runChecks({ asOf: deps.clock.now(), registers: current }, alertDeps));
        break;
      case "upsertCertification":
        current = upsertCertification(current, step);
        break;
      case "upsertVendorDocument":
        current = upsertVendorDocument(current, step);
        break;
      case "completeObligation":
        current = completeObligation(current, step, deps.clock.now());
        break;
    }
  }

  const expected = leg.expected;
  return {
    scenarioId: scenario.id,
    twin: options.twin === true,
    opened,
    resolved,
    registers: current,
    expected,
    matchesExpected: sameKeys(opened, expected.opened) && sameKeys(resolved, expected.resolved),
  };
}
