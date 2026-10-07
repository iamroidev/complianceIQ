import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { createLedger, verifyChain } from "../../src/core/ledger";
import type { Alert } from "../../src/core/types";
import type { Repo } from "../../src/core/repo/repo";
import {
  T0,
  makeAlert,
  makeBlock,
  makeCheckRun,
  makeDraft,
  makeEvent,
  makeEvidence,
  makeExplanation,
  makePriority,
  paragraph,
} from "./repo-fixtures";

export type RepoFactory = () => Promise<Repo>;

/** Persist queued writes and surface the first error (no-op for memory). */
async function persisted(repo: Repo): Promise<void> {
  await repo.flush?.();
}

/**
 * One suite, two implementations (M7 acceptance): the same expectations run
 * against the in-memory repo and the Supabase repo over Postgres. Sections
 * are isolated by unique ids and relative counts so a shared database can
 * accumulate state across tests safely.
 */
export function repoContract(name: string, makeRepo: RepoFactory): void {
  describe(name, () => {
    it("adds, reads, freezes and lists alerts", async () => {
      const repo = await makeRepo();
      const before = repo.alerts.list().length;
      const alert = makeAlert("ct_alert_basic");
      repo.alerts.add(alert);
      expect(repo.alerts.list().length).toBe(before + 1);
      expect(repo.alerts.get("ct_alert_basic")).toEqual(alert);
      expect(Object.isFrozen(repo.alerts.get("ct_alert_basic"))).toBe(true);
      await persisted(repo);
    });

    it("finds alerts by rule and subject", async () => {
      const repo = await makeRepo();
      repo.alerts.add(
        makeAlert("ct_alert_find", {
          ruleId: "DEAD-001",
          subject: { id: "ob_pen_test", name: "Annual penetration test" },
        }),
      );
      const found = repo.alerts.findByRuleSubject("DEAD-001", "ob_pen_test");
      expect(found.map((alert) => alert.id)).toContain("ct_alert_find");
      await persisted(repo);
    });

    it("rejects invalid alerts (zod) and duplicate ids synchronously", async () => {
      const repo = await makeRepo();
      expect(() => repo.alerts.add({ id: "ct_alert_bad" } as unknown as Alert)).toThrow();
      repo.alerts.add(makeAlert("ct_alert_dup"));
      expect(() => repo.alerts.add(makeAlert("ct_alert_dup"))).toThrow(/Duplicate alert/);
      await persisted(repo);
    });

    it("updates alerts with patch semantics and rejects unknown ids", async () => {
      const repo = await makeRepo();
      repo.alerts.add(makeAlert("ct_alert_update"));
      const next = repo.alerts.update("ct_alert_update", { status: "in_review" });
      expect(next.status).toBe("in_review");
      expect(next.ruleId).toBe("CERT-001");
      expect(next.id).toBe("ct_alert_update");
      expect(() => repo.alerts.update("ct_missing", { status: "filed" })).toThrow(/Unknown alert/);
      await persisted(repo);
    });

    it("adds evidence, keeps content variants, rejects duplicates", async () => {
      const repo = await makeRepo();
      const before = repo.evidence.list().length;
      const item = makeEvidence("ct_ev_1");
      repo.evidence.add(item);
      const refOnly = makeEvidence("ct_ev_2", { content: undefined, contentRef: "s3://bucket/ev2.pdf" });
      repo.evidence.add(refOnly);
      expect(repo.evidence.list().length).toBe(before + 2);
      expect(repo.evidence.get("ct_ev_1")).toEqual(item);
      expect(repo.evidence.get("ct_ev_2")?.contentRef).toBe("s3://bucket/ev2.pdf");
      expect(repo.evidence.get("ct_ev_2")?.content).toBeUndefined();
      expect(Object.isFrozen(repo.evidence.get("ct_ev_1"))).toBe(true);
      expect(() => repo.evidence.add(makeEvidence("ct_ev_1"))).toThrow(/Duplicate evidence/);
      await persisted(repo);
    });

    it("adds check runs and rejects duplicates", async () => {
      const repo = await makeRepo();
      const before = repo.checkRuns.list().length;
      const run = makeCheckRun("ct_run_1");
      repo.checkRuns.add(run);
      expect(repo.checkRuns.list().length).toBe(before + 1);
      expect(repo.checkRuns.list().find((item) => item.id === "ct_run_1")).toEqual(run);
      expect(() => repo.checkRuns.add(makeCheckRun("ct_run_1"))).toThrow(/Duplicate check run/);
      await persisted(repo);
    });

    it("appends audit blocks through the ledger and chain-verifies", async () => {
      const repo = await makeRepo();
      const start = repo.blocks.list().length;
      const ledger = createLedger(new FakeClock(T0), repo.blocks);
      const first = ledger.append({
        eventType: "CHECK_RUN",
        actor: "system:contract",
        payload: { runId: "run_ct" },
      });
      const second = ledger.append({
        eventType: "ALERT_TRIGGERED",
        actor: "system:contract",
        alertId: "ct_alert_basic",
        payload: { alertId: "ct_alert_basic" },
      });
      expect(first.blockIndex).toBe(start);
      expect(second.blockIndex).toBe(start + 1);
      expect(ledger.head()?.blockIndex).toBe(start + 1);
      expect(verifyChain(repo.blocks.list()).ok).toBe(true);
      expect(repo.blocks.get(start + 1)).toEqual(second);
      expect(Object.isFrozen(repo.blocks.get(start))).toBe(true);
      expect(() => repo.blocks.append(makeBlock(start + 1))).toThrow(/Duplicate audit block/);
      await persisted(repo);
    });

    it("stores explanations by alert and rejects duplicates", async () => {
      const repo = await makeRepo();
      repo.alerts.add(makeAlert("ct_alert_explain"));
      const before = repo.explanations.list().length;
      repo.explanations.add(makeExplanation("ct_expl_1", "ct_alert_explain"));
      expect(repo.explanations.list().length).toBe(before + 1);
      expect(repo.explanations.get("ct_expl_1")).toBeDefined();
      expect(
        repo.explanations.byAlert("ct_alert_explain").map((item) => item.id),
      ).toContain("ct_expl_1");
      expect(() =>
        repo.explanations.add(makeExplanation("ct_expl_1", "ct_alert_explain")),
      ).toThrow(/Duplicate explanation/);
      await persisted(repo);
    });

    it("stores drafts, supports edits, rejects unknown updates", async () => {
      const repo = await makeRepo();
      repo.alerts.add(makeAlert("ct_alert_draft"));
      const before = repo.drafts.list().length;
      repo.drafts.add(makeDraft("ct_draft_1", "ct_alert_draft"));
      expect(repo.drafts.list().length).toBe(before + 1);
      const edited = repo.drafts.update("ct_draft_1", {
        paragraphs: [paragraph("ct_draft_1_p1", { origin: "edited" })],
      });
      expect(edited.paragraphs[0]?.origin).toBe("edited");
      expect(edited.alertId).toBe("ct_alert_draft");
      expect(() => repo.drafts.update("ct_missing", { kind: "soc2_deficiency" })).toThrow(
        /Unknown draft/,
      );
      await persisted(repo);
    });

    it("stores priority suggestions and rejects duplicates", async () => {
      const repo = await makeRepo();
      repo.alerts.add(makeAlert("ct_alert_prio"));
      const before = repo.prioritySuggestions.list().length;
      const suggestion = makePriority("ct_prio_1", "ct_alert_prio");
      repo.prioritySuggestions.add(suggestion);
      expect(repo.prioritySuggestions.list().length).toBe(before + 1);
      expect(repo.prioritySuggestions.get("ct_prio_1")).toEqual(suggestion);
      expect(() =>
        repo.prioritySuggestions.add(makePriority("ct_prio_1", "ct_alert_prio")),
      ).toThrow(/Duplicate priority suggestion/);
      await persisted(repo);
    });

    it("stores events and rejects duplicates", async () => {
      const repo = await makeRepo();
      const before = repo.events.list().length;
      const event = makeEvent("ct_event_1");
      repo.events.add(event);
      expect(repo.events.list().length).toBe(before + 1);
      expect(repo.events.get("ct_event_1")).toEqual(event);
      expect(() => repo.events.add(makeEvent("ct_event_1"))).toThrow(/Duplicate event/);
      await persisted(repo);
    });

    it("flushes queued writes without error", async () => {
      const repo = await makeRepo();
      repo.alerts.add(makeAlert("ct_alert_flush"));
      repo.evidence.add(makeEvidence("ct_ev_flush"));
      await repo.flush?.();
      expect(repo.alerts.get("ct_alert_flush")).toBeDefined();
      expect(repo.evidence.get("ct_ev_flush")).toBeDefined();
    });
  });
}
