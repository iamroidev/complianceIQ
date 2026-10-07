import { FakeClock } from "../../src/core/clock";
import { createLedger } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { createEvidenceLocker } from "../../src/core/evidence";
import { runChecks } from "../../src/core/pipeline/run-checks";
import { buildAlert } from "../../src/core/pipeline/decide";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import { TIER1_EVENT_RULES } from "../../src/core/engine/rules/index";
import type { Alert, RuleContext } from "../../src/core/types";
import { DANIEL, KOFI, OWUSU, makeCtx, makeEvent } from "./engine-fixture";

export const T0 = "2026-03-01T09:00:00.000Z";
const MARCH = "2026-03-16T09:00:00.000Z";
const APRIL = "2026-04-01T09:00:00.000Z";

export function stateAlerts(asOf: string): Alert[] {
  const clock = new FakeClock(asOf);
  const ledger = createLedger(clock);
  const repo = createInMemoryRepo();
  const evidence = createEvidenceLocker({ ledger, repo, source: "run-checks" });
  const { opened } = runChecks({ asOf, registers: loadSeedRegisters() }, { ledger, repo, evidence, clock });
  return opened;
}

export function eventAlert(ruleId: string, ctx: RuleContext): Alert {
  const clock = new FakeClock(ctx.asOf);
  const ledger = createLedger(clock);
  const repo = createInMemoryRepo();
  const evidence = createEvidenceLocker({ ledger, repo, source: "ai-test" });
  const rule = TIER1_EVENT_RULES.find((candidate) => candidate.meta.id === ruleId)!;
  const result = rule.evaluate(ctx).find((candidate) => candidate.verdict === "fail");
  if (!result) throw new Error(`No failure for ${ruleId}`);
  const alert = buildAlert({ rule, result, ctx, existing: [] }, { ledger, repo, evidence, clock });
  if (!alert) throw new Error(`buildAlert returned null for ${ruleId}`);
  return alert;
}

export interface ScenarioAlert {
  scenarioId: string;
  alert: Alert;
}

const deposit = (amount: number, timestamp: string) =>
  makeEvent({ id: `evt_${timestamp}_${amount}`, action: "cash_deposit", actor: KOFI, context: { amount, currency: "USD" }, timestamp });

/**
 * The 11 M5 fixture scenarios built exactly as the fixture generator ran
 * them, so every baked-in evidence id (ev_N) matches the alert it is
 * validated against.
 */
export function buildScenarioAlerts(): ScenarioAlert[] {
  const t0 = stateAlerts(T0);
  const march = stateAlerts(MARCH);
  const april = stateAlerts(APRIL);
  const qtr = april.find((alert) => alert.subject.id === "ob_qtr_filing");
  if (!qtr) throw new Error("ob_qtr_filing did not fire at 2026-04-01");

  return [
    { scenarioId: "standing-cert-nana", alert: t0.find((a) => a.ruleId === "CERT-001")! },
    { scenarioId: "standing-deadline", alert: t0.find((a) => a.ruleId === "DEAD-001")! },
    { scenarioId: "standing-vendor", alert: t0.find((a) => a.ruleId === "VEND-001")! },
    { scenarioId: "expired-certification", alert: march.find((a) => a.ruleId === "CERT-001")! },
    { scenarioId: "vendor-document-lapsed", alert: march.find((a) => a.ruleId === "VEND-001" && a.subject.id === "v_cedar")! },
    { scenarioId: "missed-deadline", alert: qtr },
    { scenarioId: "structured-deposits", alert: eventAlert("AML-001", makeCtx({ events: [deposit(9_800, "2026-01-10T09:00:00.000Z"), deposit(9_400, "2026-01-11T19:00:00.000Z")] })) },
    { scenarioId: "payment-without-approver", alert: eventAlert("FIN-001", makeCtx({ events: [makeEvent({ id: "evt_pay_1", action: "payment_released", resource: { type: "payment", id: "pay_1", label: "Invoice 4711" }, context: { amount: 25_000, approvers: [DANIEL.id], requestedBy: KOFI.id } })] })) },
    { scenarioId: "sod-breach", alert: eventAlert("IAM-001", makeCtx({ events: [
      makeEvent({ id: "evt_c1", action: "commit_code", actor: OWUSU, resource: { type: "service", id: "svc-payments", label: "payments-api" }, timestamp: "2026-02-10T10:00:00.000Z" }),
      makeEvent({ id: "evt_d1", action: "deploy_prod", actor: OWUSU, resource: { type: "environment", id: "svc-deploy-prod", label: "svc-deploy-prod" }, timestamp: "2026-02-10T13:00:00.000Z" }),
    ] })) },
    { scenarioId: "restricted-record-access", alert: eventAlert("HIPAA-001", makeCtx({ events: [makeEvent({ id: "evt_view", action: "view_record", actor: DANIEL, resource: { type: "record", id: "rec_9", label: "Patient record rec_9", attributes: { restricted: true, careTeam: ["p_kwesi", "p_ama"] } } })] })) },
    { scenarioId: "leaked-secret", alert: eventAlert("DEV-001", makeCtx({ events: [makeEvent({ id: "evt_commit", action: "commit_code", actor: OWUSU, resource: { type: "service", id: "svc-payments", label: "payments-api" }, context: { scannedText: `aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";` }, timestamp: "2026-02-20T10:00:00.000Z" })] })) },
  ];
}
