import type { AuditBlock, EvidenceItem } from "../types";
import { computeCurrentHash, computePayloadHash, GENESIS_PREVIOUS_HASH } from "./chain";

export type VerifyReason =
  | "genesis"
  | "contiguity"
  | "payload_hash"
  | "linkage"
  | "current_hash"
  | "timestamp_order"
  | "evidence_hash";

export type VerifyOk = { ok: true; checked: number };
export type VerifyFailure = {
  ok: false;
  firstBrokenIndex: number;
  reason: VerifyReason;
  untrustedAfter: number;
};
export type VerifyResult = VerifyOk | VerifyFailure;

const failure = (firstBrokenIndex: number, reason: VerifyReason): VerifyFailure => ({
  ok: false,
  firstBrokenIndex,
  reason,
  untrustedAfter: firstBrokenIndex - 1,
});

/**
 * Recomputes both hashes, checks linkage, contiguous indices, non-decreasing
 * timestamps, and evidence hashes against their ledger payloads (§7.6).
 */
export function verifyChain(
  blocks: readonly AuditBlock[],
  evidence?: readonly EvidenceItem[],
): VerifyResult {
  let previous: AuditBlock | null = null;
  for (let position = 0; position < blocks.length; position += 1) {
    const block = blocks[position];
    if (block.blockIndex !== position) {
      return failure(position, "contiguity");
    }
    if (position === 0 && block.previousHash !== GENESIS_PREVIOUS_HASH) {
      return failure(0, "genesis");
    }
    if (computePayloadHash(block.payload) !== block.payloadHash) {
      return failure(position, "payload_hash");
    }
    if (previous !== null && block.previousHash !== previous.currentHash) {
      return failure(position, "linkage");
    }
    if (computeCurrentHash(block) !== block.currentHash) {
      return failure(position, "current_hash");
    }
    if (previous !== null && block.timestamp < previous.timestamp) {
      return failure(position, "timestamp_order");
    }
    previous = block;
  }
  if (evidence) {
    for (const item of evidence) {
      const block = blocks[item.ledgerBlockIndex];
      if (
        !block ||
        block.eventType !== "EVIDENCE_RECORDED" ||
        block.payload.evidenceId !== item.id ||
        block.payload.contentHash !== item.contentHash
      ) {
        return failure(Math.min(item.ledgerBlockIndex, Math.max(blocks.length - 1, 0)), "evidence_hash");
      }
    }
  }
  return { ok: true, checked: blocks.length };
}

/** Head hash of a verified chain — quoted in audit packs so auditors can compare. */
export function headHash(blocks: readonly AuditBlock[]): string | null {
  return blocks.length === 0 ? null : blocks[blocks.length - 1].currentHash;
}
