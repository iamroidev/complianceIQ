import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import type { AuditBlock } from "../types";
import type { DbPort, SelectOptions, SqlValue } from "./db";

/**
 * Local Postgres (PGLite) behind the same `DbPort` the Supabase repo writes
 * through — the production SQL runs unmodified against a real parser, and the
 * data survives restarts when a `dataDir` is given (M15 Phase C). Migrations
 * are tracked in `schema_migrations`, so only new files apply on later boots.
 */

type ColumnTypes = Map<string, string>;

/** table → (column → data_type) for parameter binding decisions. */
async function loadColumnTypes(pg: PGlite): Promise<Map<string, ColumnTypes>> {
  const result = await pg.query<{ table_name: string; column_name: string; data_type: string }>(
    `select table_name, column_name, data_type
       from information_schema.columns
      where table_schema = 'public'`,
  );
  const byTable = new Map<string, ColumnTypes>();
  for (const row of result.rows) {
    let columns = byTable.get(row.table_name);
    if (!columns) {
      columns = new Map();
      byTable.set(row.table_name, columns);
    }
    columns.set(row.column_name, row.data_type);
  }
  return byTable;
}

function tableColumns(table: string, types: Map<string, ColumnTypes>): ColumnTypes {
  const columns = types.get(table);
  if (!columns) throw new Error(`Unknown table for harness: ${table}`);
  return columns;
}

/**
 * Bind one value, with jsonb-aware casts: JS objects/arrays become JSON
 * text, strings/numbers/booleans in jsonb columns go through to_jsonb().
 */
function bind(column: string, value: unknown, columns: ColumnTypes, params: unknown[]): string {
  const name = `$${params.length + 1}`;
  const dataType = columns.get(column);
  if (dataType === "jsonb") {
    if (value === null || value === undefined) {
      params.push(null);
      return `${name}::jsonb`;
    }
    if (typeof value === "string") {
      params.push(value);
      return `to_jsonb(${name}::text)`;
    }
    if (typeof value === "number") {
      params.push(value);
      return `to_jsonb(${name}::numeric)`;
    }
    if (typeof value === "boolean") {
      params.push(value);
      return `to_jsonb(${name}::boolean)`;
    }
    params.push(JSON.stringify(value));
    return `${name}::jsonb`;
  }
  params.push(value === undefined ? null : (value as SqlValue));
  return name;
}

function createPglitePort(pg: PGlite, types: Map<string, ColumnTypes>): DbPort {
  return {
    async select<T>(table: string, options?: SelectOptions): Promise<T[]> {
      const columns = tableColumns(table, types);
      const params: unknown[] = [];
      const clauses: string[] = [];
      for (const [column, value] of Object.entries(options?.eq ?? {})) {
        if (!columns.has(column)) throw new Error(`Unknown column ${table}.${column}`);
        params.push(value);
        clauses.push(`"${column}" = $${params.length}`);
      }
      let sql = `select * from public."${table}"`;
      if (clauses.length > 0) sql += ` where ${clauses.join(" and ")}`;
      if (options?.orderBy) {
        const direction = options.orderBy.ascending === false ? "desc" : "asc";
        sql += ` order by "${options.orderBy.column}" ${direction}`;
      }
      const result = await pg.query(sql, params);
      return result.rows as T[];
    },

    async insert(table: string, rows: Record<string, unknown>[]): Promise<void> {
      for (const row of rows) {
        const columns = tableColumns(table, types);
        const names = Object.keys(row);
        if (names.length === 0) continue;
        const params: unknown[] = [];
        const values = names.map((column) => bind(column, row[column], columns, params));
        const sql =
          `insert into public."${table}" (${names.map((c) => `"${c}"`).join(", ")}) ` +
          `values (${values.join(", ")})`;
        await pg.query(sql, params);
      }
    },

    async update(
      table: string,
      patch: Record<string, unknown>,
      eq: Record<string, SqlValue>,
    ): Promise<void> {
      const columns = tableColumns(table, types);
      const params: unknown[] = [];
      const sets = Object.keys(patch).map((column) => `"${column}" = ${bind(column, patch[column], columns, params)}`);
      const where = Object.entries(eq).map(([column, value]) => {
        params.push(value);
        return `"${column}" = $${params.length}`;
      });
      if (where.length === 0) throw new Error(`update ${table}: WHERE clause required`);
      const sql =
        `update public."${table}" set ${sets.join(", ")} where ${where.join(" and ")}`;
      await pg.query(sql, params);
    },

    async appendAuditBlock(block: AuditBlock): Promise<void> {
      await pg.query(
        `select public.append_audit_block(
           $1::int, $2::text, $3::text, $4::text, $5::text,
           $6::jsonb, $7::text, $8::text, $9::text
         )`,
        [
          block.blockIndex,
          block.timestamp,
          block.eventType,
          block.actor,
          block.alertId ?? null,
          JSON.stringify(block.payload),
          block.payloadHash,
          block.previousHash,
          block.currentHash,
        ],
      );
    },

    async resetDemo(): Promise<void> {
      await pg.query(`select public.reset_demo()`);
    },
  };
}

async function runMigrations(pg: PGlite, migrationsDir: string): Promise<void> {
  await pg.exec(
    `create table if not exists public.schema_migrations (
       filename text primary key,
       applied_at timestamptz not null default now()
     )`,
  );
  const applied = new Set(
    (await pg.query<{ filename: string }>(`select filename from public.schema_migrations`)).rows.map(
      (row) => row.filename,
    ),
  );
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    if (applied.has(file)) continue;
    await pg.exec(await readFile(path.join(migrationsDir, file), "utf8"));
    await pg.query(`insert into public.schema_migrations (filename) values ($1)`, [file]);
  }
}

export type DemoRole = "officer" | "auditor" | "admin";
export type SessionRole = DemoRole | "anon" | null;

export interface PgliteOptions {
  /** File-backed directory for durability; omit for an in-memory instance (tests). */
  dataDir?: string;
  /** Defaults to `<cwd>/supabase` (migrations + seed.sql). */
  supabaseDir?: string;
}

export interface PgliteStorage {
  pg: PGlite;
  db: DbPort;
  /** Switch the session into a role's JWT (RLS reads request.jwt.claims), or back to owner. */
  asRole(role: SessionRole): Promise<void>;
  close(): Promise<void>;
}

/**
 * Fresh offline Postgres with all migrations + seed applied — in-memory
 * without a `dataDir`, file-backed (durable) with one.
 */
export async function createPgliteDb(options: PgliteOptions = {}): Promise<PgliteStorage> {
  const { PGlite: PGliteClass } = await import("@electric-sql/pglite");
  const pg = new PGliteClass(options.dataDir);
  const supabaseDir = options.supabaseDir ?? path.join(process.cwd(), "supabase");
  await runMigrations(pg, path.join(supabaseDir, "migrations"));
  // seed.sql is idempotent (on conflict do nothing) — safe on every boot.
  await pg.exec(await readFile(path.join(supabaseDir, "seed.sql"), "utf8"));
  const types = await loadColumnTypes(pg);
  const db = createPglitePort(pg, types);

  return {
    pg,
    db,
    async asRole(role) {
      if (role === null) {
        await pg.query(`select set_config('request.jwt.claims', '', false)`);
        await pg.query(`reset role`);
        return;
      }
      if (role === "anon") {
        await pg.query(`select set_config('request.jwt.claims', '', false)`);
        await pg.query(`set role anon`);
        return;
      }
      await pg.query(`select set_config('request.jwt.claims', $1, false)`, [
        JSON.stringify({ app_metadata: { role } }),
      ]);
      await pg.query(`set role authenticated`);
    },
    async close() {
      await pg.close();
    },
  };
}

/** Default data directory: one durable database per running server (by port). */
export function defaultPgliteDataDir(): string {
  const fromEnv = process.env.PGDATA;
  if (fromEnv) return fromEnv;
  const suffix = process.env.PORT ? `-${process.env.PORT}` : "";
  return path.join(process.cwd(), ".data", `pglite${suffix}`);
}

/** Ensure the parent directory exists before PGlite opens the dataDir. */
export async function ensureDataDir(dataDir: string): Promise<void> {
  await mkdir(dataDir, { recursive: true });
}
