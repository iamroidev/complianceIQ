import { describe, it, expect } from "vitest";
import { FakeClock } from "../../src/core/clock";
import {
  GENESIS_PREVIOUS_HASH,
  LedgerInvariantError,
  canonical,
  computeCurrentHash,
  computePayloadHash,
  createLedger,
  ledgerEventLabel,
  sha256hex,
} from "../../src/core/ledger";
import { LEDGER_EVENT_TYPES } from "../../src/core/types";
import { buildChain, CHAIN_START } from "./ledger-fixture";

describe("ledger chain", () => {
  it("starts at genesis: index 0, previousHash 64 zeros", () => {
    const { blocks } = buildChain(3);
    expect(blocks[0].blockIndex).toBe(0);
    expect(blocks[0].previousHash).toBe("0".repeat(64));
    expect(GENESIS_PREVIOUS_HASH).toBe("0".repeat(64));
    expect(blocks.map((block) => block.blockIndex)).toEqual([0, 1, 2]);
  });

  it("links blocks: previousHash equals the previous currentHash", () => {
    const { blocks } = buildChain(5);
    for (let index = 1; index < blocks.length; index += 1) {
      expect(blocks[index].previousHash).toBe(blocks[index - 1].currentHash);
      expect(blocks[index].timestamp >= blocks[index - 1].timestamp).toBe(true);
    }
  });

  it("hashes exactly per the spec formulas", () => {
    const payload = { amount: 9_800, rulesRun: 3 };
    const payloadHash = computePayloadHash(payload);
    expect(payloadHash).toBe(sha256hex(canonical(payload)));
    const parts = {
      blockIndex: 4,
      timestamp: "2026-01-15T10:00:04.000Z",
      eventType: "CHECK_RUN" as const,
      actor: "scheduler@complianceiq.test",
      alertId: "alrt_4",
      payloadHash,
      previousHash: "b".repeat(64),
    };
    expect(computeCurrentHash(parts)).toBe(
      sha256hex(
        canonical({
          blockIndex: 4,
          timestamp: parts.timestamp,
          eventType: parts.eventType,
          actor: parts.actor,
          alertId: "alrt_4",
          payloadHash,
          previousHash: parts.previousHash,
        }),
      ),
    );
  });

  it("never lets time move backwards at append", () => {
    const clock = new FakeClock(CHAIN_START);
    const ledger = createLedger(clock);
    ledger.append({ eventType: "CHECK_RUN", actor: "a@test", payload: {} });
    expect(() =>
      ledger.append({ eventType: "CHECK_RUN", actor: "a@test", payload: {} }),
    ).not.toThrow();
    clock.set("2026-01-15T09:00:00.000Z");
    expect(() =>
      ledger.append({ eventType: "CHECK_RUN", actor: "a@test", payload: {} }),
    ).toThrow(LedgerInvariantError);
    clock.set(ledger.head()?.timestamp ?? "");
    expect(() =>
      ledger.append({ eventType: "CHECK_RUN", actor: "a@test", payload: {} }),
    ).not.toThrow();
  });

  it("stores frozen blocks and returns a copy of the array", () => {
    const ledger = createLedger(new FakeClock(CHAIN_START));
    const block = ledger.append({ eventType: "CHECK_RUN", actor: "a@test", payload: { n: 1 } });
    expect(Object.isFrozen(block)).toBe(true);
    const snapshot = ledger.blocks;
    ledger.append({ eventType: "CHECK_RUN", actor: "a@test", payload: { n: 2 } });
    expect(snapshot).toHaveLength(1);
    expect(ledger.blocks).toHaveLength(2);
    expect(ledger.head()).toBe(ledger.blocks[1]);
  });

  it("labels every ledger event type for the UI", () => {
    expect(LEDGER_EVENT_TYPES).toHaveLength(16);
    expect(ledgerEventLabel("ALERT_AUTO_RESOLVED")).toBe("Alert closed automatically");
    for (const eventType of LEDGER_EVENT_TYPES) {
      const label = ledgerEventLabel(eventType);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/^[A-Z_]+$/);
    }
  });

  it("keeps timestamps driven by the injected clock", () => {
    const { blocks, clock } = buildChain(3);
    expect(blocks[0].timestamp).toBe(new Date(Date.parse(CHAIN_START) + 1_000).toISOString());
    expect(blocks[2].timestamp).toBe(clock.now());
  });
});
