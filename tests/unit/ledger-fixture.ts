import { FakeClock } from "../../src/core/clock";
import { createLedger } from "../../src/core/ledger";
import type { AuditBlock, EvidenceItem } from "../../src/core/types";

export const CHAIN_START = "2026-01-15T10:00:00.000Z";

export interface BuiltChain {
  blocks: AuditBlock[];
  evidence: EvidenceItem[];
  clock: FakeClock;
}

/** Five blocks: even indices are EVIDENCE_RECORDED, odd are CHECK_RUN. */
export function buildChain(length = 5): BuiltChain {
  const clock = new FakeClock(CHAIN_START);
  const ledger = createLedger(clock);
  const evidence: EvidenceItem[] = [];
  for (let index = 0; index < length; index += 1) {
    clock.advance(1_000);
    if (index % 2 === 0) {
      const evidenceId = `ev_${index}`;
      const contentHash = index === 0 ? "a".repeat(64) : `${index}`.repeat(64);
      const block = ledger.append({
        eventType: "EVIDENCE_RECORDED",
        actor: `officer${index}@example.test`,
        payload: { evidenceId, contentHash, amount: 9_800 + index },
      });
      evidence.push({
        id: evidenceId,
        kind: "record_snapshot",
        title: `Snapshot ${index}`,
        source: "seed/people.json",
        collectedAt: block.timestamp,
        contentHash,
        ledgerBlockIndex: block.blockIndex,
      });
    } else {
      ledger.append({
        eventType: "CHECK_RUN",
        actor: `scheduler@complianceiq.test`,
        alertId: `alrt_${index}`,
        payload: { rulesRun: 3, passed: 2, failed: 1 },
      });
    }
  }
  return { blocks: [...ledger.blocks], evidence, clock };
}
