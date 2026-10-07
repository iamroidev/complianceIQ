import { describe, it, expect } from "vitest";
import { computeCurrentHash, createTamperSim, headHash, tamperBlocks, verifyChain } from "../../src/core/ledger";
import type { TamperKind } from "../../src/core/ledger";
import type { AuditBlock } from "../../src/core/types";
import { buildChain } from "./ledger-fixture";

describe("ledger verification", () => {
  it("verifies a valid chain and exposes the head hash", () => {
    const { blocks, evidence } = buildChain(5);
    const result = verifyChain(blocks, evidence);
    expect(result).toEqual({ ok: true, checked: 5 });
    expect(headHash(blocks)).toBe(blocks[4].currentHash);
    expect(verifyChain([])).toEqual({ ok: true, checked: 0 });
    expect(headHash([])).toBeNull();
  });

  const tamperCases: { kind: TamperKind; index: number; reason: string }[] = [
    { kind: "payload", index: 1, reason: "payload_hash" },
    { kind: "timestamp", index: 1, reason: "current_hash" },
    { kind: "actor", index: 1, reason: "current_hash" },
    { kind: "previous_hash", index: 1, reason: "linkage" },
    { kind: "current_hash", index: 1, reason: "current_hash" },
    { kind: "delete", index: 1, reason: "contiguity" },
    { kind: "reorder", index: 1, reason: "contiguity" },
    { kind: "forged_insert", index: 3, reason: "contiguity" },
  ];

  for (const { kind, index, reason } of tamperCases) {
    it(`detects ${kind} at the exact broken index`, () => {
      const { blocks } = buildChain(5);
      const tampered = tamperBlocks(blocks, kind);
      const result = verifyChain(tampered);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.firstBrokenIndex).toBe(index);
      expect(result.reason).toBe(reason);
      expect(result.untrustedAfter).toBe(index - 1);
    });
  }

  it("detects a genesis mismatch", () => {
    const { blocks } = buildChain(3);
    blocks[0] = { ...blocks[0], previousHash: "9".repeat(64) };
    const result = verifyChain(blocks);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.firstBrokenIndex).toBe(0);
    expect(result.reason).toBe("genesis");
    expect(result.untrustedAfter).toBe(-1);
  });

  it("catches a backdated block even when its own hash is repaired", () => {
    const { blocks } = buildChain(4);
    const backdated: AuditBlock = {
      ...blocks[2],
      timestamp: new Date(Date.parse(blocks[1].timestamp) - 60_000).toISOString(),
    };
    const repaired: AuditBlock = {
      ...backdated,
      currentHash: computeCurrentHash(backdated),
    };
    const forged = [...blocks.slice(0, 2), repaired, blocks[3]];
    const result = verifyChain(forged);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.firstBrokenIndex).toBe(2);
    expect(result.reason).toBe("timestamp_order");
  });

  it("never mutates the input chain", () => {
    const { blocks } = buildChain(5);
    for (const kind of ["payload", "delete", "reorder", "forged_insert"] as TamperKind[]) {
      tamperBlocks(blocks, kind);
    }
    expect(verifyChain(blocks)).toEqual({ ok: true, checked: 5 });
  });

  it("tamper sim: apply fails verification, restore recovers", () => {
    const { blocks, evidence } = buildChain(5);
    const sim = createTamperSim(blocks);
    for (const kind of ["payload", "timestamp", "actor", "previous_hash", "current_hash", "delete", "reorder", "forged_insert"] as TamperKind[]) {
      sim.apply(kind);
      expect(verifyChain(sim.blocks).ok).toBe(false);
      sim.restore();
      expect(verifyChain(sim.blocks, evidence)).toEqual({ ok: true, checked: 5 });
    }
    expect(sim.blocks).toEqual(blocks);
  });

  it("verifies evidence hashes against their ledger payloads", () => {
    const { blocks, evidence } = buildChain(5);
    const mutated = evidence.map((item) =>
      item.id === "ev_2" ? { ...item, contentHash: "c".repeat(64) } : item,
    );
    const result = verifyChain(blocks, mutated);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.firstBrokenIndex).toBe(2);
    expect(result.reason).toBe("evidence_hash");
    expect(verifyChain(blocks, evidence).ok).toBe(true);
  });
});
