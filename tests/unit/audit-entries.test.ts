import { describe, expect, it } from "vitest";
import {
  buildHistoryEntries,
  buildLedgerEntries,
} from "@/components/workspace/case-text";
import type { Alert, AuditBlock, EvidenceItem } from "@/core/types";

const HASH = "a".repeat(64);

function block(
  overrides: Pick<AuditBlock, "blockIndex" | "eventType" | "payload"> &
    Partial<Pick<AuditBlock, "alertId" | "actor" | "timestamp">>,
): AuditBlock {
  return {
    timestamp: "2026-03-01T09:30:00.000Z",
    actor: "pipeline@complianceiq.test",
    payloadHash: HASH,
    previousHash: HASH,
    currentHash: HASH,
    ...overrides,
  };
}

const evidence: EvidenceItem[] = [
  {
    id: "ev_9",
    kind: "record_snapshot",
    title: "Condition cleared — CERT-001 Ama Serwaa Owusu",
    source: "people register",
    collectedAt: "2026-03-01T09:30:00.000Z",
    contentHash: HASH,
    ledgerBlockIndex: 4,
  },
];

const alert = {
  id: "alrt_7",
  summarySentence: "Ama Serwaa Owusu's First Aid certificate expired on 15 Mar 2026.",
} as Alert;

describe("buildLedgerEntries (audit record page)", () => {
  it("reads each event type as a plain sentence with a grounded sub line", () => {
    const entries = buildLedgerEntries(
      [
        block({
          blockIndex: 0,
          eventType: "CHECK_RUN",
          payload: { subjectsChecked: 8, opened: 2, rulesRun: 8 },
        }),
        block({
          blockIndex: 1,
          eventType: "ALERT_TRIGGERED",
          alertId: "alrt_7",
          payload: { alertId: "alrt_7", ruleId: "CERT-001" },
        }),
        block({
          blockIndex: 2,
          eventType: "EVIDENCE_RECORDED",
          payload: { evidenceId: "ev_1", title: "Snapshot for Ama Serwaa Owusu" },
        }),
        block({
          blockIndex: 3,
          eventType: "REPORT_FILED",
          alertId: "alrt_7",
          actor: "officer",
          payload: { reason: "Confirmed structuring" },
        }),
        block({
          blockIndex: 4,
          eventType: "ALERT_AUTO_RESOLVED",
          alertId: "alrt_7",
          payload: { evidenceId: "ev_9", ruleId: "CERT-001" },
        }),
        block({
          blockIndex: 5,
          eventType: "AUDIT_PACK_EXPORTED",
          payload: { findings: 6, evidence: 41 },
        }),
      ],
      [alert],
      evidence,
    );

    expect(entries.map((entry) => entry.sentence)).toEqual([
      "Checks run",
      "Alert opened",
      "Evidence recorded",
      "Mara Osei filed this report",
      "Closed automatically · renewal attached",
      "Audit pack exported",
    ]);
    expect(entries[0].sub).toBe("8 subjects checked · 2 new alerts");
    expect(entries[1].sub).toBe(alert.summarySentence);
    expect(entries[2].sub).toBe("Snapshot for Ama Serwaa Owusu");
    expect(entries[3].sub).toBe("Reason: Confirmed structuring");
    expect(entries[4].sub).toBe("Condition cleared — CERT-001 Ama Serwaa Owusu");
    expect(entries[5].sub).toBe("6 findings included");
    expect(entries[0].entry).toBe(0);
    expect(entries[0].tech).toEqual([{ label: "Actor", value: "pipeline@complianceiq.test" }]);
    expect(entries[0].hashes?.[0]).toEqual({ label: "Payload", value: HASH });
  });

  it("keeps timestamps for the timeline clock", () => {
    const [entry] = buildLedgerEntries([block({ blockIndex: 0, eventType: "CHECK_RUN", payload: {} })]);
    expect(entry.time).toBe("2026-03-01T09:30:00.000Z");
  });
});

describe("buildHistoryEntries (case History tab)", () => {
  it("shows the auto-close line with the evidence item that cleared it", () => {
    const entries = buildHistoryEntries(
      [
        block({ blockIndex: 3, eventType: "ALERT_AUTO_RESOLVED", alertId: "alrt_7", payload: { evidenceId: "ev_9" } }),
        block({ blockIndex: 4, eventType: "REPORT_FILED", alertId: "alrt_7", actor: "officer", payload: {} }),
      ],
      evidence,
    );
    expect(entries[0].sentence).toBe("Closed automatically");
    expect(entries[0].sub).toBe("Condition cleared — CERT-001 Ama Serwaa Owusu");
    expect(entries[1].sentence).toBe("Mara Osei filed this report");
  });

  it("still lists only entries that belong to the case", () => {
    const entries = buildHistoryEntries([
      block({ blockIndex: 0, eventType: "CHECK_RUN", payload: {} }),
      block({ blockIndex: 1, eventType: "REPORT_FILED", alertId: "alrt_7", actor: "officer", payload: {} }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].sentence).toBe("Mara Osei filed this report");
  });
});
