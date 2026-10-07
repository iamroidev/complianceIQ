import { FakeClock } from "@/core/clock";
import { SEED_T0, loadSeedRegisters } from "@/core/engine/seed";
import { createEvidenceLocker, type EvidenceLocker } from "@/core/evidence";
import { createLedger, type Ledger } from "@/core/ledger";
import type { AlertDeps } from "@/core/pipeline/decide";
import { runChecks } from "@/core/pipeline/run-checks";
import { defaultResponseSettings, ResponseSettings } from "@/core/responses/response-rules";
import { createSupabaseDb, type DbPort } from "@/core/repo/db";
import { createInMemoryRepo } from "@/core/repo/memory-repo";
import { createPgliteDb, defaultPgliteDataDir, ensureDataDir } from "@/core/repo/pglite-db";
import type { Repo } from "@/core/repo/repo";
import { createSupabaseRepo } from "@/core/repo/supabase-repo";
import { Registers, type Registers as RegistersType } from "@/core/types";

/**
 * Server-side runtime state (MASTER §7.3, §9): one process-wide holder for
 * the repo, ledger, clock and registers. The runtime object lives on
 * `globalThis` (the standard Next.js pattern for shared modules in dev), but
 * the DATA lives in storage (M15 Phase C): `DATA_MODE=pglite` (default) is a
 * durable local Postgres, `supabase` the hosted one, `memory` the
 * tests-only holder. The clock, registers and response modes persist in the
 * single `app_state` row, and reset/scenario wipe through `reset_demo()` —
 * nothing is re-seeded on every boot unless the storage says it is empty.
 */
export type DataMode = "memory" | "pglite" | "supabase";

export interface AppState {
  repo: Repo;
  ledger: Ledger;
  evidence: EvidenceLocker;
  clock: FakeClock;
  registers: RegistersType;
  responseSettings: ResponseSettings;
  mode: DataMode;
  /** Absent in memory mode; owns the durable app_state row. */
  storage?: Storage;
}

function dataMode(): DataMode {
  const value = process.env.DATA_MODE;
  if (value === "memory" || value === "supabase") return value;
  if (value === "pglite") return "pglite";
  // Durable local Postgres by default — state survives restarts (M15 Phase C).
  return "pglite";
}

/* ------------------------------ durable app_state ------------------------------ */

interface SavedState {
  clockAt: string;
  registers: RegistersType;
  responseSettings: ResponseSettings;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  throw new Error(`app_state.${label}: expected a json object`);
}

async function loadAppState(db: DbPort): Promise<SavedState | null> {
  const rows = await db.select<Record<string, unknown>>("app_state");
  const row = rows[0];
  if (!row) return null;
  const clockAt = typeof row.clock_at === "string" ? row.clock_at : SEED_T0;
  return {
    clockAt,
    registers: Registers.parse(asObject(row.registers, "registers")),
    responseSettings: ResponseSettings.parse(asObject(row.response_settings, "response_settings")),
  };
}

async function saveAppState(db: DbPort, state: AppState): Promise<void> {
  const patch = {
    clock_at: state.clock.now(),
    registers: state.registers,
    response_settings: state.responseSettings,
    updated_at: new Date().toISOString(),
  };
  const rows = await db.select<Record<string, unknown>>("app_state");
  if (rows.length > 0) {
    await db.update("app_state", patch, { id: true });
  } else {
    await db.insert("app_state", [{ id: true, ...patch }]);
  }
}

export interface Storage {
  mode: Exclude<DataMode, "memory">;
  db: DbPort;
  load(): Promise<SavedState | null>;
  save(state: AppState): Promise<void>;
  /** The sanctioned wipe behind reset + scenario (reset_demo, 0004). */
  reset(): Promise<void>;
}

function storageOf(mode: Exclude<DataMode, "memory">, db: DbPort): Storage {
  return {
    mode,
    db,
    load: () => loadAppState(db),
    save: (state) => saveAppState(db, state),
    reset: async () => {
      if (!db.resetDemo) throw new Error(`storage mode "${mode}" cannot reset`);
      await db.resetDemo();
    },
  };
}

async function openStorage(mode: Exclude<DataMode, "memory">): Promise<Storage> {
  if (mode === "supabase") return storageOf(mode, await createSupabaseDb());
  const dataDir = defaultPgliteDataDir();
  await ensureDataDir(dataDir);
  const pglite = await createPgliteDb({ dataDir });
  return storageOf("pglite", pglite.db);
}

/* --------------------------------- boot ---------------------------------- */

async function buildState(withStartChecks: boolean, reused?: Storage): Promise<AppState> {
  const mode = dataMode();
  let storage: Storage | undefined = reused;
  if (!storage && mode !== "memory") {
    try {
      storage = await openStorage(mode);
    } catch (err) {
      console.warn(`[ComplianceIQ] Storage initialization for "${mode}" fell back to in-memory mode:`, err);
      storage = undefined;
    }
  }
  const repo = storage ? await createSupabaseRepo(storage.db) : createInMemoryRepo();
  const clock = new FakeClock(SEED_T0);
  const ledger = createLedger(clock, repo.blocks);
  const evidence = createEvidenceLocker({ ledger, repo, source: "complianceiq" });
  let registers = loadSeedRegisters();
  let responseSettings = defaultResponseSettings();

  const saved = storage ? await storage.load().catch(() => null) : null;
  if (saved) {
    // Durable state (M15 Phase C): time, registers and response modes were
    // saved by an earlier run — pick them up instead of re-seeding.
    clock.set(saved.clockAt);
    registers = saved.registers;
    responseSettings = saved.responseSettings;
  }

  const effectiveMode = storage ? mode : "memory";
  const state: AppState = { repo, ledger, evidence, clock, registers, responseSettings, mode: effectiveMode, storage };
  if (storage && !saved) {
    try {
      await storage.save(state);
    } catch (err) {
      console.warn("[ComplianceIQ] Failed to save initial app_state:", err);
    }
  }
  // §7.3 "on app start" — only when the record is empty, so cold starts and
  // reloads never re-run the seeded checks into an already-populated record.
  if (withStartChecks && repo.alerts.list().length === 0) {
    runChecks(
      { asOf: clock.now(), registers, responseSettings },
      { repo, ledger, evidence, clock },
    );
  }
  return state;
}

/*
 * In dev, routes compile lazily and a later-compiled route can re-instantiate
 * shared modules, which used to silently drop the demo state (the scenario
 * ran, then the next route booted a fresh T0 state). The state therefore
 * lives on `globalThis`, the standard Next.js pattern for process-wide
 * singletons, so every module instance sees the same slot. The DATA itself
 * is durable in storage (see Storage above).
 */
interface StateStore {
  state: AppState | null;
  pending: Promise<AppState> | null;
}

const STORE_KEY = "__complianceiq_state_store__";

function store(): StateStore {
  const holder = globalThis as Record<string, unknown>;
  if (!(STORE_KEY in holder)) {
    holder[STORE_KEY] = { state: null, pending: null } satisfies StateStore;
  }
  return holder[STORE_KEY] as StateStore;
}

/** The process-wide state; the first call runs the app-start checks (§7.3). */
export async function getState(): Promise<AppState> {
  const slot = store();
  if (slot.state) return slot.state;
  if (!slot.pending) {
    const promise = buildState(true).then((next) => {
      // Only publish if a reset/scenario did not take over while building.
      if (slot.pending === promise) {
        slot.state = next;
        slot.pending = null;
      }
      return next;
    });
    slot.pending = promise;
  }
  return slot.pending;
}

export function alertDepsOf(current: AppState): AlertDeps {
  return {
    repo: current.repo,
    ledger: current.ledger,
    evidence: current.evidence,
    clock: current.clock,
  };
}

/** Persist the in-memory runtime into the app_state row (no-op in memory mode). */
export async function persistAppState(): Promise<void> {
  const current = store().state;
  if (!current?.storage) return;
  await current.storage.save(current);
}

/** Register writes replace the object (registers are never mutated in place). */
export async function setRegisters(next: RegistersType): Promise<void> {
  const current = await getState();
  current.registers = next;
  await current.storage?.save(current);
}

/** Swap in a freshly built state (shared by reset + scenario). */
function publish(next: AppState): AppState {
  const slot = store();
  slot.pending = null;
  slot.state = next;
  return next;
}

/** Admin "Reset demo" (§9): wipe the record, then the app-start checks reseed it. */
export async function resetDemoState(): Promise<AppState> {
  const previous = store().state;
  if (previous?.storage) {
    await previous.repo.flush?.();
    await previous.storage.reset();
    return publish(await buildState(true, previous.storage));
  }
  return publish(await buildState(true));
}

/**
 * Fresh state WITHOUT the app-start check run: scenario runs (§7.8) start
 * from a clean slate so their evidence ids and expected sets match the
 * fixtures exactly, then the run's own state becomes the app state.
 */
export async function beginScenarioState(): Promise<AppState> {
  const previous = store().state;
  if (previous?.storage) {
    await previous.repo.flush?.();
    await previous.storage.reset();
    return publish(await buildState(false, previous.storage));
  }
  return publish(await buildState(false));
}
