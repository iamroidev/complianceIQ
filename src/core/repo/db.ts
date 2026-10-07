import type { AuditBlock } from "../types";

export type SqlValue = string | number | boolean | null;

export interface SelectOptions {
  /** WHERE clause as equality pairs (ANDed). */
  eq?: Record<string, SqlValue>;
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * The table-CRUD port the Supabase repo writes through. Two adapters exist:
 * `createSupabaseDb` (production, supabase-js over HTTP) and a pglite-backed
 * adapter in tests — same contract, so the repo is identical either way.
 */
export interface DbPort {
  select<T = Record<string, unknown>>(table: string, options?: SelectOptions): Promise<T[]>;
  insert(table: string, rows: Record<string, unknown>[]): Promise<void>;
  update(
    table: string,
    patch: Record<string, unknown>,
    eq: Record<string, SqlValue>,
  ): Promise<void>;
  /** The only append path for audit_blocks (RPC with advisory lock, §7.6). */
  appendAuditBlock(block: AuditBlock): Promise<void>;
  /**
   * Wipe the record for a demo reset/scenario (`reset_demo()`, 0004): a
   * sanctioned TRUNCATE that the append-only triggers deliberately allow.
   */
  resetDemo?(): Promise<void>;
}

const TABLE_NAME = /^[a-z_][a-z0-9_]*$/;
const COLUMN_NAME = /^[a-z_][a-z0-9_]*$/;

function assertName(name: string, kind: "table" | "column"): void {
  const pattern = kind === "table" ? TABLE_NAME : COLUMN_NAME;
  if (!pattern.test(name)) throw new Error(`Unsafe ${kind} name: ${name}`);
}

export interface SupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

export function readSupabaseEnv(env: Record<string, string | undefined> = process.env): SupabaseEnv {
  const url = env["NEXT_PUBLIC_SUPABASE_URL"] ?? env["SUPABASE_URL"];
  const serviceRoleKey = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return { url, serviceRoleKey };
}

/** Minimal structural view of the supabase-js client the repo needs. */
interface PgResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface PgFilter<T> extends PromiseLike<PgResponse<T>> {
  eq(column: string, value: SqlValue): PgFilter<T>;
  order(column: string, options?: { ascending?: boolean }): PgFilter<T>;
}

interface PgFrom {
  select(columns: string): PgFilter<Record<string, unknown>[]>;
  insert(rows: Record<string, unknown>[]): PgFilter<Record<string, unknown>[]>;
  update(patch: Record<string, unknown>): PgFilter<Record<string, unknown>[]>;
}

interface PgClient {
  from(table: string): PgFrom;
  rpc(name: string, params: Record<string, unknown>): PgFilter<Record<string, unknown>>;
}

async function unwrap<T>(query: PromiseLike<PgResponse<T>>, label: string): Promise<T> {
  const response = await query;
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.data ?? (undefined as T);
}

/** Production adapter: dynamic import keeps supabase-js out of the memory path. */
export async function createSupabaseDb(
  env: Record<string, string | undefined> = process.env,
): Promise<DbPort> {
  const { url, serviceRoleKey } = readSupabaseEnv(env);
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as PgClient;

  return {
    select<T>(table: string, options?: SelectOptions): Promise<T[]> {
      assertName(table, "table");
      let query = client.from(table).select("*");
      for (const [column, value] of Object.entries(options?.eq ?? {})) {
        assertName(column, "column");
        query = query.eq(column, value);
      }
      if (options?.orderBy) {
        assertName(options.orderBy.column, "column");
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }
      return unwrap(query, `select ${table}`) as Promise<T[]>;
    },
    insert(table: string, rows: Record<string, unknown>[]): Promise<void> {
      assertName(table, "table");
      if (rows.length === 0) return Promise.resolve();
      return unwrap(client.from(table).insert(rows), `insert ${table}`).then(() => undefined);
    },
    update(table: string, patch: Record<string, unknown>, eq: Record<string, SqlValue>): Promise<void> {
      assertName(table, "table");
      let query = client.from(table).update(patch);
      for (const [column, value] of Object.entries(eq)) {
        assertName(column, "column");
        query = query.eq(column, value);
      }
      return unwrap(query, `update ${table}`).then(() => undefined);
    },
    appendAuditBlock(block: AuditBlock): Promise<void> {
      return unwrap(
        client.rpc("append_audit_block", {
          p_block_index: block.blockIndex,
          p_timestamp: block.timestamp,
          p_event_type: block.eventType,
          p_actor: block.actor,
          p_alert_id: block.alertId ?? null,
          p_payload: block.payload,
          p_payload_hash: block.payloadHash,
          p_previous_hash: block.previousHash,
          p_current_hash: block.currentHash,
        }),
        "append_audit_block",
      ).then(() => undefined);
    },
    resetDemo(): Promise<void> {
      return unwrap(client.rpc("reset_demo", {}), "reset_demo").then(() => undefined);
    },
  };
}
