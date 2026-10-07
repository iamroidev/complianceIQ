import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { createLedger } from "../../src/core/ledger";
import {
  alertToRow,
  createSupabaseRepo,
  evidenceToRow,
} from "../../src/core/repo/supabase-repo";
import { createPgliteDb, type PgliteStorage } from "../../src/core/repo/pglite-db";
import { repoContract } from "./repo-contract";
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
} from "./repo-fixtures";

const TABLES = [
  "accounts",
  "alerts",
  "app_state",
  "audit_blocks",
  "certifications",
  "check_runs",
  "drafts",
  "events",
  "evidence_items",
  "explanations",
  "obligations",
  "people",
  "policy_clauses",
  "policy_documents",
  "priority_suggestions",
  "profiles",
  "requirements",
  "response_settings",
  "schema_migrations",
  "source_connections",
  "vendor_documents",
  "vendors",
];

let harness: PgliteStorage;

beforeAll(async () => {
  harness = await createPgliteDb();
});

afterAll(async () => {
  await harness?.close();
});

// M7 acceptance: the same contract suite passes on both implementations.
repoContract("Repo contract (Supabase over Postgres)", async () =>
  createSupabaseRepo(harness.db),
);

describe("Supabase repo: Postgres guarantees (§7.6/§8)", () => {
  it("creates exactly the 22 expected tables", async () => {
    const result = await harness.pg.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' order by table_name`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual(TABLES);
  });

  it("seeds three demo users with the spec roles", async () => {
    const result = await harness.pg.query<{ email: string; role: string }>(
      `select email, role from public.profiles order by role`,
    );
    expect(result.rows.map((row) => row.role)).toEqual(["admin", "auditor", "officer"]);
    expect(result.rows.map((row) => row.email)).toEqual([
      "admin@complianceiq.dev",
      "auditor@complianceiq.dev",
      "officer@complianceiq.dev",
    ]);
  });

  it("rejects UPDATE and DELETE on audit_blocks and evidence_items for every role, including the owner", async () => {
    await harness.db.insert("evidence_items", [evidenceToRow(makeEvidence("ac_ev_immutable"))]);
    await harness.db.insert("audit_blocks", [
      {
        block_index: 900,
        timestamp: T0,
        event_type: "CHECK_RUN",
        actor: "system:acceptance",
        alert_id: null,
        payload: { runId: "run_900" },
        payload_hash: "a".repeat(64),
        previous_hash: "0".repeat(64),
        current_hash: "b".repeat(64),
      },
    ]);

    await expect(
      harness.pg.query(`update public.evidence_items set title = 'tampered' where id = 'ac_ev_immutable'`),
    ).rejects.toThrow(/append-only/);
    await expect(
      harness.pg.query(`delete from public.evidence_items where id = 'ac_ev_immutable'`),
    ).rejects.toThrow(/append-only/);
    await expect(
      harness.pg.query(`update public.audit_blocks set actor = 'tampered' where block_index = 900`),
    ).rejects.toThrow(/append-only/);
    await expect(
      harness.pg.query(`delete from public.audit_blocks where block_index = 900`),
    ).rejects.toThrow(/append-only/);
  });

  it("revokes UPDATE/DELETE from the API roles", async () => {
    try {
      await harness.asRole("officer");
      await expect(
        harness.pg.query(`update public.evidence_items set title = 'x' where id = 'ac_ev_immutable'`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        harness.pg.query(`delete from public.evidence_items where id = 'ac_ev_immutable'`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        harness.pg.query(`update public.audit_blocks set actor = 'x' where block_index = 900`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        harness.pg.query(`delete from public.audit_blocks where block_index = 900`),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await harness.asRole(null);
    }
  });

  it("appends blocks only through the advisory-locked RPC", async () => {
    try {
      await harness.asRole("officer");
      await harness.db.appendAuditBlock(makeBlock(901));
      await expect(harness.db.appendAuditBlock(makeBlock(901))).rejects.toThrow(/duplicate key/i);

      await harness.pg
        .query(
          `insert into public.audit_blocks
             (block_index, timestamp, event_type, actor, payload, payload_hash, previous_hash, current_hash)
           values (902, $1, 'CHECK_RUN', 'direct', '{}'::jsonb, $2, $2, $2)`,
          [T0, "a".repeat(64)],
        )
        .catch(() => undefined);
    } finally {
      await harness.asRole(null);
    }

    const appended = await harness.pg.query(
      `select block_index from public.audit_blocks where block_index in (901, 902) order by block_index`,
    );
    expect(appended.rows).toEqual([{ block_index: 901 }]);
  });

  it("enforces the role matrix: anon sees nothing, auditor cannot decide, officer acts, admin owns settings", async () => {
    await harness.db.insert("alerts", [alertToRow(makeAlert("ac_alert_rls"))]);
    await harness.db.insert("people", [
      {
        id: "ac_person_1",
        name: "Ac Person",
        role: "Analyst",
        department: "Compliance",
        status: "active",
        manager_id: null,
      },
    ]);
    await harness.pg.query(
      `insert into public.response_settings (response_id, mode, updated_at, updated_by)
       values ('ac_settings', 'suggest', $1, null)`,
      [T0],
    );

    try {
      await harness.asRole("anon");
      const anonAlerts = await harness.pg.query(`select id from public.alerts`);
      expect(anonAlerts.rows).toHaveLength(0);
      const anonProfiles = await harness.pg.query(`select id from public.profiles`);
      expect(anonProfiles.rows).toHaveLength(0);

      await harness.asRole("officer");
      const officerAlerts = await harness.pg.query(
        `select id from public.alerts where id = 'ac_alert_rls'`,
      );
      expect(officerAlerts.rows).toHaveLength(1);

      // officer can decide (File to review)
      await harness.pg.query(
        `update public.alerts set status = 'in_review' where id = 'ac_alert_rls'`,
      );

      // engine-owned table: no user role may insert alerts
      await harness.db
        .insert("alerts", [alertToRow(makeAlert("ac_alert_forbidden_insert"))])
        .catch(() => undefined);

      // officer uploads evidence (§7.5)
      await harness.db.insert("evidence_items", [evidenceToRow(makeEvidence("ac_ev_officer"))]);
      await harness.pg.query(
        `insert into public.people (id, name, role, department, status, manager_id)
         values ('ac_person_officer', 'Ac Officer', 'Analyst', 'Compliance', 'active', null)`,
      );

      // auditor: read-only everywhere
      await harness.asRole("auditor");
      await harness.pg
        .query(`update public.alerts set status = 'dismissed' where id = 'ac_alert_rls'`)
        .catch(() => undefined);
      await harness.db
        .insert("evidence_items", [evidenceToRow(makeEvidence("ac_ev_auditor"))])
        .catch(() => undefined);
      await harness.pg
        .query(
          `insert into public.people (id, name, role, department, status, manager_id)
           values ('ac_person_auditor', 'Ac Auditor', 'Analyst', 'Compliance', 'active', null)`,
        )
        .catch(() => undefined);

      // admin owns response modes
      await harness.asRole("admin");
      await harness.pg.query(
        `update public.response_settings set mode = 'automatic' where response_id = 'ac_settings'`,
      );

      // officer cannot change admin settings
      await harness.asRole("officer");
      await harness.pg
        .query(`update public.response_settings set mode = 'off' where response_id = 'ac_settings'`)
        .catch(() => undefined);
    } finally {
      await harness.asRole(null);
    }

    const alert = await harness.pg.query<{ status: string }>(
      `select status from public.alerts where id = 'ac_alert_rls'`,
    );
    expect(alert.rows[0]?.status).toBe("in_review");

    const forbidden = await harness.pg.query(
      `select id from public.alerts where id = 'ac_alert_forbidden_insert'`,
    );
    expect(forbidden.rows).toHaveLength(0);

    const evidence = await harness.pg.query<{ id: string }>(
      `select id from public.evidence_items where id like 'ac_ev_%' order by id`,
    );
    expect(evidence.rows.map((row) => row.id)).toContain("ac_ev_officer");
    expect(evidence.rows.map((row) => row.id)).not.toContain("ac_ev_auditor");

    const people = await harness.pg.query<{ id: string }>(
      `select id from public.people where id like 'ac_person_%' order by id`,
    );
    expect(people.rows.map((row) => row.id)).toEqual(["ac_person_1", "ac_person_officer"]);

    const settings = await harness.pg.query<{ mode: string }>(
      `select mode from public.response_settings where response_id = 'ac_settings'`,
    );
    expect(settings.rows[0]?.mode).toBe("automatic");
  });

  it("enforces primary keys at the database level", async () => {
    await harness.db.insert("alerts", [alertToRow(makeAlert("ac_alert_pk"))]);
    await expect(
      harness.db.insert("alerts", [alertToRow(makeAlert("ac_alert_pk"))]),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("surfaces queued write errors through flush()", async () => {
    const repo = await createSupabaseRepo(harness.db);
    repo.drafts.add(makeDraft("ac_draft_no_alert", "ac_missing_alert"));
    await expect(repo.flush?.()).rejects.toThrow(/foreign key/i);
    expect(repo.drafts.get("ac_draft_no_alert")).toBeDefined();
  });

  it("persists everything: a fresh repo reads back what the first one wrote", async () => {
    const repo = await createSupabaseRepo(harness.db);
    const alert = makeAlert("ac_alert_reload", { status: "filed" });
    repo.alerts.add(alert);
    repo.evidence.add(makeEvidence("ac_ev_reload"));
    repo.explanations.add(makeExplanation("ac_expl_reload", "ac_alert_reload"));
    repo.drafts.add(makeDraft("ac_draft_reload", "ac_alert_reload"));
    repo.prioritySuggestions.add(makePriority("ac_prio_reload", "ac_alert_reload"));
    repo.events.add(makeEvent("ac_event_reload"));
    repo.checkRuns.add(makeCheckRun("ac_run_reload"));

    const expectedIndex = (repo.blocks.list().at(-1)?.blockIndex ?? -1) + 1;
    const block = createLedger(new FakeClock(T0), repo.blocks).append({
      eventType: "EVIDENCE_RECORDED",
      actor: "system:reload",
      payload: { evidenceId: "ac_ev_reload" },
    });
    expect(block.blockIndex).toBe(expectedIndex);
    await repo.flush?.();

    const fresh = await createSupabaseRepo(harness.db);
    expect(fresh.alerts.get("ac_alert_reload")).toEqual(alert);
    expect(Object.isFrozen(fresh.alerts.get("ac_alert_reload"))).toBe(true);
    expect(fresh.evidence.get("ac_ev_reload")).toBeDefined();
    expect(fresh.explanations.byAlert("ac_alert_reload").map((item) => item.id)).toContain(
      "ac_expl_reload",
    );
    expect(fresh.drafts.get("ac_draft_reload")?.kind).toBe("sar");
    expect(fresh.prioritySuggestions.get("ac_prio_reload")).toBeDefined();
    expect(fresh.events.get("ac_event_reload")).toBeDefined();
    expect(fresh.checkRuns.list().find((run) => run.id === "ac_run_reload")).toBeDefined();
    expect(fresh.blocks.get(block.blockIndex)).toEqual(block);
  });
});
