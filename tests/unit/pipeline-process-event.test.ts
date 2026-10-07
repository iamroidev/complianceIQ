import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { SEED_T0, loadSeedRegisters } from "../../src/core/engine/seed";
import { createEvidenceLocker } from "../../src/core/evidence";
import { createLedger } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { processEvent } from "../../src/core/pipeline/process-event";
import {
  defaultResponseSettings,
  type ResponseSettings,
} from "../../src/core/responses/response-rules";
import type { Alert } from "../../src/core/types";

function fresh() {
  const clock = new FakeClock(SEED_T0);
  const repo = createInMemoryRepo();
  const ledger = createLedger(clock, repo.blocks);
  const evidence = createEvidenceLocker({ ledger, repo, source: "process-event-test" });
  return {
    clock,
    repo,
    ledger,
    evidence,
    deps: { ledger, repo, evidence, clock },
    registers: loadSeedRegisters(),
  };
}

const COMMIT_EVENT = {
  id: "evt_commit",
  domain: "code",
  actor: { id: "p_owusu", name: "A. Owusu", role: "Developer" },
  action: "commit_code",
  resource: { type: "service", id: "svc-payments", label: "payments-api" },
  context: {
    scannedText: 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";',
  },
  timestamp: "2026-02-20T10:00:00.000Z",
  source: "git",
};

const PAY_EVENT = {
  id: "evt_pay_1",
  domain: "finance",
  actor: { id: "p_kofi", name: "Kofi Adjei-Boateng", role: "Treasury manager" },
  action: "payment_released",
  resource: { type: "payment", id: "pay_1", label: "Invoice 4711" },
  context: { amount: 25000, approvers: ["p_daniel"], requestedBy: "p_kofi" },
  timestamp: "2026-02-25T09:00:00.000Z",
  source: "erp",
};

const NOTE_EVENT = {
  id: "evt_note_1",
  domain: "finance",
  actor: { id: "p_kofi", name: "Kofi Adjei-Boateng", role: "Treasury manager" },
  action: "note_logged",
  resource: { type: "payment", id: "pay_1", label: "Invoice 4711" },
  context: { note: "treasury reviewed" },
  timestamp: "2026-02-26T09:00:00.000Z",
  source: "erp",
};

const VENDOR_EVENT = {
  id: "evt_contract_note",
  domain: "vendor",
  actor: { id: "p_ops", name: "Ops person", role: "Vendor manager" },
  action: "contract_note",
  resource: { type: "vendor", id: "v_cedar", label: "Cedar Labs" },
  context: {},
  timestamp: "2026-02-27T09:00:00.000Z",
  source: "contract-system",
};

function withSettings(settings: ResponseSettings): ResponseSettings {
  return settings;
}

const settingsWith = (overrides: Partial<ResponseSettings>): ResponseSettings =>
  withSettings({ ...defaultResponseSettings(), ...overrides });

const eventTypes = (blocks: readonly { eventType: string }[]) =>
  blocks.map((block) => block.eventType);

describe("processEvent pipeline (MASTER §7.2)", () => {
  it("is idempotent per event id — a replay stores nothing new", async () => {
    const run = fresh();
    const first = await processEvent(
      { event: COMMIT_EVENT, registers: run.registers },
      run.deps,
    );
    expect(first.duplicate).toBe(false);
    expect(first.alerts).toHaveLength(1);
    const blocksAfterFirst = run.ledger.blocks.length;

    const second = await processEvent(
      { event: COMMIT_EVENT, registers: run.registers },
      run.deps,
    );
    expect(second.duplicate).toBe(true);
    expect(second.alerts).toEqual([]);
    expect(second.event).toEqual(first.event);
    expect(run.repo.events.list()).toHaveLength(1);
    expect(run.repo.alerts.list()).toHaveLength(1);
    expect(run.ledger.blocks).toHaveLength(blocksAfterFirst);
  });

  it("dedupes against history: an unrelated event re-evaluates the old failure but opens nothing", async () => {
    const run = fresh();
    const first = await processEvent(
      { event: PAY_EVENT, registers: run.registers },
      run.deps,
    );
    expect(first.alerts.map((alert) => `${alert.ruleId}:${alert.subject.id}`)).toEqual([
      "FIN-001:pay_1",
    ]);

    const second = await processEvent(
      { event: NOTE_EVENT, registers: run.registers },
      run.deps,
    );
    expect(second.duplicate).toBe(false);
    expect(second.alerts).toEqual([]);
    expect(run.repo.alerts.list()).toHaveLength(1);
    expect(run.repo.events.list()).toHaveLength(2);
  });

  it("treats a different dedupe key as a new incident on the same rule and subject", async () => {
    const run = fresh();
    await processEvent({ event: PAY_EVENT, registers: run.registers }, run.deps);
    const secondEvent = {
      ...PAY_EVENT,
      id: "evt_pay_2",
      context: { amount: 30000, approvers: ["p_daniel"], requestedBy: "p_kofi" },
      timestamp: "2026-02-25T11:00:00.000Z",
    };
    const second = await processEvent(
      { event: secondEvent, registers: run.registers },
      run.deps,
    );
    expect(second.alerts).toHaveLength(1);
    expect(run.repo.alerts.list()).toHaveLength(2);
    expect(second.alerts[0].id).not.toBe(run.repo.alerts.list()[0].id);
  });

  it("runs only the event's domain rules — an unmatched domain opens nothing", async () => {
    const run = fresh();
    const outcome = await processEvent(
      { event: VENDOR_EVENT, registers: run.registers },
      run.deps,
    );
    expect(outcome.alerts).toEqual([]);
    expect(run.repo.alerts.list()).toEqual([]);
    expect(run.repo.events.list()).toHaveLength(1);
  });

  it("generates and links the explanation and draft, proving DRAFT_GENERATED on the ledger", async () => {
    const run = fresh();
    const outcome = await processEvent(
      { event: COMMIT_EVENT, registers: run.registers },
      run.deps,
    );
    const alert = outcome.alerts[0];
    expect(alert.explanationId).toBe(`exp_${alert.id}`);
    expect(alert.draftId).toBeTruthy();

    const explanation = run.repo.explanations.byAlert(alert.id)[0];
    const draft = run.repo.drafts.byAlert(alert.id)[0];
    expect(explanation.id).toBe(alert.explanationId);
    expect(draft.id).toBe(alert.draftId);
    expect(explanation.generatedBy).toBe("fixture");
    expect(draft.generatedBy).toBe("fixture");
    expect(draft.alertId).toBe(alert.id);

    const drafts = run.ledger.blocks.filter((block) => block.eventType === "DRAFT_GENERATED");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].payload["draftId"]).toBe(draft.id);
    expect(run.repo.alerts.get(alert.id)?.draftId).toBe(draft.id);
  });

  it("rejects an event that fails the ComplianceEvent schema", async () => {
    const run = fresh();
    await expect(
      processEvent({ event: { id: "" }, registers: run.registers }, run.deps),
    ).rejects.toThrow(/Invalid event/);
    expect(run.repo.events.list()).toEqual([]);
  });

  describe("response rules (§7.9)", () => {
    it("suggest mode proposes the catalog response and executes nothing", async () => {
      const run = fresh();
      const outcome = await processEvent(
        {
          event: COMMIT_EVENT,
          registers: run.registers,
          responseSettings: defaultResponseSettings(),
        },
      run.deps,
      );
      expect(outcome.executed).toEqual([]);
      expect(outcome.responses).toHaveLength(1);
      expect(outcome.responses[0]).toMatchObject({
        responseId: "block-pipeline-on-secret",
        ruleId: "DEV-001",
        mode: "suggest",
        alertId: outcome.alerts[0].id,
      });
      expect(outcome.responses[0].wouldBeRequest.action).toBe("block_ci_pipeline");
      expect(eventTypes(run.ledger.blocks)).not.toContain("RESPONSE_EXECUTED");
    });

    it("automatic mode executes the response as a ledger block (dry run by default)", async () => {
      const run = fresh();
      const outcome = await processEvent(
        {
          event: COMMIT_EVENT,
          registers: run.registers,
          responseSettings: settingsWith({ "block-pipeline-on-secret": "automatic" }),
        },
        run.deps,
      );
      expect(outcome.responses).toEqual([]);
      expect(outcome.executed).toHaveLength(1);
      expect(outcome.executed[0].responseId).toBe("block-pipeline-on-secret");
      expect(outcome.executed[0].dryRun).toBe(true);

      const executed = run.ledger.blocks.filter(
        (block) => block.eventType === "RESPONSE_EXECUTED",
      );
      expect(executed).toHaveLength(1);
      expect(executed[0].alertId).toBe(outcome.alerts[0].id);
      expect(executed[0].payload["responseId"]).toBe("block-pipeline-on-secret");
      expect(executed[0].payload["dryRun"]).toBe(true);
    });

    it("off mode neither suggests nor executes", async () => {
      const run = fresh();
      const outcome = await processEvent(
        {
          event: COMMIT_EVENT,
          registers: run.registers,
          responseSettings: settingsWith({ "block-pipeline-on-secret": "off" }),
        },
        run.deps,
      );
      expect(outcome.responses).toEqual([]);
      expect(outcome.executed).toEqual([]);
      expect(eventTypes(run.ledger.blocks)).not.toContain("RESPONSE_EXECUTED");
    });

    it("an alert without a catalog trigger gets no response", async () => {
      const run = fresh();
      const outcome = await processEvent(
        { event: PAY_EVENT, registers: run.registers },
        run.deps,
      );
      expect(outcome.alerts[0].ruleId).toBe("FIN-001");
      expect(outcome.responses).toEqual([]);
      expect(outcome.executed).toEqual([]);
    });
  });
});

describe("processEvent outcome shape", () => {
  it("returns the stored event and opened alerts with evidence refs intact", async () => {
    const run = fresh();
    const outcome = await processEvent(
      { event: COMMIT_EVENT, registers: run.registers },
      run.deps,
    );
    expect(outcome.event?.id).toBe("evt_commit");
    const alert: Alert = outcome.alerts[0];
    expect(alert.evidenceRefs).toEqual([{ type: "event", id: "evt_commit" }]);
    expect(alert.snapshotEvidenceIds).toHaveLength(1);
    expect(run.repo.evidence.get(alert.snapshotEvidenceIds[0])).toBeTruthy();
  });
});
