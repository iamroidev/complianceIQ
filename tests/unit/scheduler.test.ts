import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { createLedger } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { createEvidenceLocker } from "../../src/core/evidence";
import { runChecks } from "../../src/core/pipeline/run-checks";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import { createScheduler, DEFAULT_CHECK_INTERVAL_MS } from "../../src/core/scheduler";

const T0 = "2026-03-01T09:00:00.000Z";

describe("scheduled checks (MASTER §7.3 / §11)", () => {
  it("is due until it first runs, then only once the interval has elapsed", () => {
    const scheduler = createScheduler();
    expect(DEFAULT_CHECK_INTERVAL_MS).toBe(5 * 60 * 1_000);
    expect(scheduler.intervalMs).toBe(DEFAULT_CHECK_INTERVAL_MS);
    expect(scheduler.lastRunAt).toBeNull();
    expect(scheduler.isDue(T0)).toBe(true);
    expect(scheduler.nextRunAt(T0)).toBe(T0);

    scheduler.markRan(T0);
    expect(scheduler.lastRunAt).toBe(T0);
    expect(scheduler.isDue(T0)).toBe(false);
    expect(scheduler.isDue("2026-03-01T09:04:59.999Z")).toBe(false);
    expect(scheduler.isDue("2026-03-01T09:05:00.000Z")).toBe(true);
    expect(scheduler.nextRunAt(T0)).toBe("2026-03-01T09:05:00.000Z");
  });

  it("accepts a custom interval and a pre-existing last run", () => {
    const scheduler = createScheduler({ intervalMs: 60_000, lastRunAt: T0 });
    expect(scheduler.isDue(T0)).toBe(false);
    expect(scheduler.isDue("2026-03-01T09:00:59.999Z")).toBe(false);
    expect(scheduler.isDue("2026-03-01T09:01:00.000Z")).toBe(true);
    expect(scheduler.nextRunAt(T0)).toBe("2026-03-01T09:01:00.000Z");
  });

  it("validates the interval and refuses time moving backwards", () => {
    expect(() => createScheduler({ intervalMs: 0 })).toThrow(/positive/);
    expect(() => createScheduler({ intervalMs: Number.NaN })).toThrow(/positive/);
    expect(() => createScheduler({ intervalMs: -1 })).toThrow(/positive/);
    expect(() => createScheduler({ lastRunAt: "never" })).toThrow(/ISO-8601/);

    const scheduler = createScheduler({ lastRunAt: T0 });
    expect(() => scheduler.markRan("2026-02-28T00:00:00.000Z")).toThrow(/backwards/);
    expect(() => scheduler.isDue("not-a-date")).toThrow(/ISO-8601/);
    expect(() => scheduler.nextRunAt("not-a-date")).toThrow(/ISO-8601/);
  });

  it("time travel: the demo clock advances and the scheduled run sees the expired certificate", () => {
    const clock = new FakeClock(T0);
    const ledger = createLedger(clock);
    const repo = createInMemoryRepo();
    const evidence = createEvidenceLocker({ ledger, repo, source: "run-checks" });
    const deps = { ledger, repo, evidence, clock };
    const scheduler = createScheduler();
    const registers = loadSeedRegisters();

    expect(scheduler.isDue(clock.now())).toBe(true);
    const first = runChecks({ asOf: clock.now(), registers }, deps);
    scheduler.markRan(clock.now());
    expect(first.opened).toHaveLength(3);

    clock.advance(4 * 60_000);
    expect(scheduler.isDue(clock.now())).toBe(false);

    clock.advanceDays(15); // 2026-03-16 — Ama's First Aid expired, Cedar's DPA lapsed, the dependency scan entered its warning window
    expect(scheduler.isDue(clock.now())).toBe(true);
    const second = runChecks({ asOf: clock.now(), registers }, deps);
    expect(second.opened.map((alert) => alert.subject.id)).toEqual([
      "p_ama",
      "ob_deps_scan",
      "v_cedar",
    ]);
    scheduler.markRan(clock.now());
    expect(scheduler.isDue(clock.now())).toBe(false);
    expect(scheduler.lastRunAt).toBe(clock.now());
    expect(repo.checkRuns.list().map((run) => run.opened)).toEqual([3, 3]);
  });
});
