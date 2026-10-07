import type { AuditBlock, LedgerEventType } from "../types";
import type { Clock } from "../clock";
import { canonical } from "./canonical";
import { sha256hex } from "./hash";

export const GENESIS_PREVIOUS_HASH = "0".repeat(64);

export interface BlockDraft {
  eventType: LedgerEventType;
  actor: string;
  alertId?: string;
  payload: Record<string, unknown>;
}

/** payloadHash = sha256hex(canonical(payload)) */
export function computePayloadHash(payload: Record<string, unknown>): string {
  return sha256hex(canonical(payload));
}

/** currentHash = sha256hex(canonical({ blockIndex, timestamp, eventType, actor, alertId, payloadHash, previousHash })) */
export function computeCurrentHash(block: {
  blockIndex: number;
  timestamp: string;
  eventType: LedgerEventType;
  actor: string;
  alertId?: string;
  payloadHash: string;
  previousHash: string;
}): string {
  return sha256hex(
    canonical({
      blockIndex: block.blockIndex,
      timestamp: block.timestamp,
      eventType: block.eventType,
      actor: block.actor,
      alertId: block.alertId,
      payloadHash: block.payloadHash,
      previousHash: block.previousHash,
    }),
  );
}

export class LedgerInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerInvariantError";
  }
}

/** The single append path: contiguous index, genesis at 0, non-decreasing timestamps. */
export function appendBlock(
  previous: AuditBlock | null,
  draft: BlockDraft,
  timestamp: string,
): AuditBlock {
  const isGenesis = previous === null;
  if (!isGenesis && timestamp < previous.timestamp) {
    throw new LedgerInvariantError(
      `Ledger timestamps never decrease: ${timestamp} < ${previous.timestamp}`,
    );
  }
  const blockIndex = isGenesis ? 0 : previous.blockIndex + 1;
  const previousHash = isGenesis ? GENESIS_PREVIOUS_HASH : previous.currentHash;
  const payloadHash = computePayloadHash(draft.payload);
  const block = {
    blockIndex,
    timestamp,
    eventType: draft.eventType,
    actor: draft.actor,
    alertId: draft.alertId,
    payload: draft.payload,
    payloadHash,
    previousHash,
  };
  return { ...block, currentHash: computeCurrentHash(block) };
}

export interface Ledger {
  append(draft: BlockDraft): AuditBlock;
  readonly blocks: readonly AuditBlock[];
  head(): AuditBlock | null;
}

/** Read/append surface the ledger needs — satisfied by the Repo's BlockStore (M7). */
export interface LedgerStore {
  list(): AuditBlock[];
  append(block: AuditBlock): void;
}

/** Block index the next append will claim — lets callers derive ids before appending. */
export function nextBlockIndex(ledger: Ledger): number {
  return (ledger.head()?.blockIndex ?? -1) + 1;
}

/**
 * Append-only ledger (§7.6). Without a store it keeps its own frozen array
 * (DATA_MODE=memory); with a store (Repo.blocks) blocks live in the repo and
 * the DB's append-only guarantees apply.
 */
export function createLedger(clock: Clock, store?: LedgerStore): Ledger {
  const fallback: AuditBlock[] = [];
  const target: LedgerStore = store ?? {
    list: () => fallback.slice(),
    append: (block) => {
      fallback.push(block);
    },
  };
  return {
    append(draft: BlockDraft): AuditBlock {
      const list = target.list();
      const block = appendBlock(list[list.length - 1] ?? null, draft, clock.now());
      target.append(Object.freeze(block));
      return block;
    },
    get blocks(): readonly AuditBlock[] {
      return target.list();
    },
    head(): AuditBlock | null {
      const list = target.list();
      return list[list.length - 1] ?? null;
    },
  };
}
