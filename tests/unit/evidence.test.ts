import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { canonical, createLedger, sha256hex, verifyChain } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { createEvidenceLocker } from "../../src/core/evidence";
import type { EvidenceItem } from "../../src/core/types";

const T0 = "2026-03-01T09:00:00.000Z";

function setup() {
  const clock = new FakeClock(T0);
  const ledger = createLedger(clock);
  const repo = createInMemoryRepo();
  const locker = createEvidenceLocker({ ledger, repo, source: "run-checks" });
  return { clock, ledger, repo, locker };
}

describe("evidence locker (MASTER §7.5)", () => {
  it("records an item whose id, hash, store row and ledger payload agree", () => {
    const { ledger, repo, locker } = setup();
    const content = { amount: 9_800, nested: { flag: true } };
    const item = locker.record(
      "record_snapshot",
      "Snapshot: CERT-001",
      content,
      { type: "record", id: "p_nana" },
    );

    expect(item.id).toBe("ev_0");
    expect(item.ledgerBlockIndex).toBe(0);
    expect(item.collectedAt).toBe(T0);
    expect(item.source).toBe("run-checks");
    expect(item.kind).toBe("record_snapshot");
    expect(item.subjectRef).toEqual({ type: "record", id: "p_nana" });
    expect(item.contentHash).toBe(sha256hex(canonical(content)));

    const block = ledger.blocks[0];
    expect(block.eventType).toBe("EVIDENCE_RECORDED");
    expect(block.payload).toMatchObject({
      evidenceId: item.id,
      contentHash: item.contentHash,
      kind: "record_snapshot",
      title: "Snapshot: CERT-001",
    });
    expect(repo.evidence.get(item.id)).toEqual(item);
    expect(verifyChain(ledger.blocks, repo.evidence.list())).toEqual({ ok: true, checked: 1 });
  });

  it("hands out ids from the next block index and honours a per-call source", () => {
    const { locker } = setup();
    const first = locker.record("record_snapshot", "First", { n: 1 });
    const second = locker.record("document", "Second", { n: 2 }, undefined, "ai-layer");

    expect(first.id).toBe("ev_0");
    expect(second.id).toBe("ev_1");
    expect(second.ledgerBlockIndex).toBe(1);
    expect(first.source).toBe("run-checks");
    expect(second.source).toBe("ai-layer");
  });

  it("stores a frozen clone so later caller edits cannot change the hashed content", () => {
    const { ledger, locker } = setup();
    const content: { rows: { id: string }[] } = { rows: [{ id: "p_ama" }] };
    const item = locker.record("record_snapshot", "Snapshot", content, {
      type: "record",
      id: "p_ama",
    });

    content.rows[0].id = "p_mutated";
    content.rows.push({ id: "p_added" });

    const stored = locker.get(item.id)!.content as { rows: { id: string }[] };
    expect(stored).toEqual({ rows: [{ id: "p_ama" }] });
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.rows)).toBe(true);
    expect(verifyChain(ledger.blocks, locker.list())).toEqual({ ok: true, checked: 1 });
  });

  it("verifier flags a mutated evidence row as evidence_hash", () => {
    const { ledger, locker } = setup();
    const item = locker.record("record_snapshot", "Snapshot", { n: 1 });
    const tampered: EvidenceItem[] = [{ ...item, contentHash: "f".repeat(64) }];

    expect(verifyChain(ledger.blocks, tampered)).toMatchObject({
      ok: false,
      reason: "evidence_hash",
    });
  });

  it("rejects duplicate evidence ids and unknown kinds", () => {
    const { repo, locker } = setup();
    const item = locker.record("record_snapshot", "Snapshot", { n: 1 });

    expect(() => repo.evidence.add({ ...item })).toThrow(/Duplicate evidence id/);
    expect(() =>
      repo.evidence.add({ ...item, id: "ev_99", kind: "not_a_kind" as EvidenceItem["kind"] }),
    ).toThrow();
  });
});
