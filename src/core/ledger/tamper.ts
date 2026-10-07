import type { AuditBlock } from "../types";
import { appendBlock } from "./chain";

/** What the tamper panel can break — each one must be caught by verifyChain. */
export type TamperKind =
  | "payload"
  | "timestamp"
  | "actor"
  | "previous_hash"
  | "current_hash"
  | "delete"
  | "reorder"
  | "forged_insert";

const DEFAULT_TARGET_INDEX = 1;

function clone(blocks: readonly AuditBlock[]): AuditBlock[] {
  return structuredClone([...blocks]);
}

function targetIndexFor(blocks: readonly AuditBlock[], requested?: number): number {
  const fallback = blocks.length > DEFAULT_TARGET_INDEX ? DEFAULT_TARGET_INDEX : 0;
  const requestedIndex = requested ?? fallback;
  return Math.min(Math.max(requestedIndex, 0), Math.max(blocks.length - 1, 0));
}

function mutatePayload(block: AuditBlock): Record<string, unknown> {
  const payload = { ...block.payload };
  const numericKey = Object.entries(payload).find(([, value]) => typeof value === "number");
  if (numericKey) {
    payload[numericKey[0]] = (numericKey[1] as number) + 1;
  } else {
    payload.tampered = true;
  }
  return payload;
}

/** Returns a tampered copy; the input chain is never touched. */
export function tamperBlocks(
  blocks: readonly AuditBlock[],
  kind: TamperKind,
  options?: { targetIndex?: number },
): AuditBlock[] {
  const working = clone(blocks);
  if (working.length === 0) return working;
  const index = targetIndexFor(working, options?.targetIndex);

  switch (kind) {
    case "payload": {
      const block = working[index];
      working[index] = { ...block, payload: mutatePayload(block) };
      return working;
    }
    case "timestamp": {
      const block = working[index];
      working[index] = { ...block, timestamp: new Date(Date.parse(block.timestamp) - 60_000).toISOString() };
      return working;
    }
    case "actor": {
      const block = working[index];
      working[index] = { ...block, actor: "mallory@attacker.test" };
      return working;
    }
    case "previous_hash": {
      if (index === 0) return working;
      const block = working[index];
      working[index] = { ...block, previousHash: "f".repeat(64) };
      return working;
    }
    case "current_hash": {
      const block = working[index];
      working[index] = { ...block, currentHash: "e".repeat(64) };
      return working;
    }
    case "delete": {
      working.splice(index, 1);
      return working;
    }
    case "reorder": {
      const swapIndex = working.length >= 3 ? 1 : 0;
      const other = swapIndex + 1;
      if (other < working.length) {
        const saved = working[swapIndex];
        working[swapIndex] = working[other];
        working[other] = saved;
      }
      return working;
    }
    case "forged_insert": {
      const source = working[Math.min(index, working.length - 1)];
      const forgedPayload = mutatePayload(source);
      const forged = appendBlock(source, {
        eventType: source.eventType,
        actor: "mallory@attacker.test",
        alertId: source.alertId,
        payload: forgedPayload,
      }, source.timestamp);
      working.splice(Math.min(index + 1, working.length), 0, forged);
      return working;
    }
  }
}

export interface TamperSim {
  readonly blocks: readonly AuditBlock[];
  apply(kind: TamperKind, options?: { targetIndex?: number }): readonly AuditBlock[];
  restore(): void;
}

/** In-memory tamper playground: apply → verify → restore; never touches the stored ledger. */
export function createTamperSim(storedBlocks: readonly AuditBlock[]): TamperSim {
  const pristine = clone(storedBlocks);
  let working = clone(pristine);
  return {
    get blocks(): readonly AuditBlock[] {
      return working;
    },
    apply(kind: TamperKind, options?: { targetIndex?: number }): readonly AuditBlock[] {
      working = tamperBlocks(working, kind, options);
      return working;
    },
    restore(): void {
      working = clone(pristine);
    },
  };
}
