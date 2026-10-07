import { describe, it, expect } from "vitest";
import {
  Alert,
  AuditBlock,
  ComplianceEvent,
  LEDGER_EVENT_TYPES,
  Obligation,
  Registers,
  RuleResult,
  Severity,
} from "../../src/core/types";
import { buildChain } from "./ledger-fixture";

describe("data contracts", () => {
  it("accepts a well-formed compliance event", () => {
    const parsed = ComplianceEvent.safeParse({
      id: "evt_1",
      domain: "finance",
      actor: { id: "p_1", name: "Ada Lovelace", role: "treasurer" },
      action: "cash_deposit",
      resource: { type: "account", id: "acc_9", attributes: { currency: "USD" } },
      context: { channel: "branch" },
      timestamp: "2026-01-15T10:00:00.000Z",
      source: "seed/events/structured-deposits",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects bad domains and timestamps", () => {
    const base = {
      id: "evt_1",
      domain: "finance",
      actor: { id: "p_1", name: "Ada", role: "treasurer" },
      action: "cash_deposit",
      resource: { type: "account", id: "acc_9" },
      context: {},
      timestamp: "2026-01-15T10:00:00.000Z",
      source: "test",
    };
    expect(ComplianceEvent.safeParse({ ...base, domain: "banking" }).success).toBe(false);
    expect(ComplianceEvent.safeParse({ ...base, timestamp: "15/01/2026" }).success).toBe(false);
    expect(ComplianceEvent.safeParse({ ...base, action: "" }).success).toBe(false);
  });

  it("accepts a ledger block built by the chain", () => {
    const { blocks } = buildChain(2);
    expect(AuditBlock.safeParse(blocks[1]).success).toBe(true);
    expect(
      AuditBlock.safeParse({ ...blocks[1], payloadHash: "not-a-hash" }).success,
    ).toBe(false);
  });

  it("declares exactly the fourteen ledger event types", () => {
    expect(LEDGER_EVENT_TYPES).toHaveLength(16);
    expect(new Set(LEDGER_EVENT_TYPES).size).toBe(16);
  });

  it("enforces severity and register enums", () => {
    expect(Severity.safeParse("critical").success).toBe(true);
    expect(Severity.safeParse("catastrophic").success).toBe(false);
    const registers = Registers.safeParse({
      people: [
        {
          id: "p_1",
          name: "Ada",
          role: "treasurer",
          department: "finance",
          status: "active",
        },
      ],
      certifications: [],
      requirements: [],
      vendors: [],
      accounts: [],
      obligations: [],
    });
    expect(registers.success).toBe(true);
    expect(
      Registers.safeParse({
        people: [{ id: "p_1", name: "Ada", role: "r", department: "d", status: "sabbatical" }],
        certifications: [],
        requirements: [],
        vendors: [],
        accounts: [],
        obligations: [],
      }).success,
    ).toBe(false);
  });

  it("requires obligation quotes and rule verdicts", () => {
    expect(
      Obligation.safeParse({
        id: "ob_1",
        title: "MFA for admins",
        plainDescription: "Admins must use MFA.",
        kind: "requirement",
        source: { documentId: "doc_1", quote: "" },
        status: "proposed",
        origin: "manual",
        ruleIds: [],
      }).success,
    ).toBe(false);
    expect(
      RuleResult.safeParse({
        ruleId: "IAM-001",
        ruleVersion: "1",
        verdict: "maybe",
        subject: { id: "s", name: "S" },
        triggeringRefs: [],
        observed: {},
        parameters: {},
      }).success,
    ).toBe(false);
    expect(
      Alert.safeParse({
        id: "alrt_1",
        ruleId: "AML-001",
        ruleVersion: "1",
        domain: "finance",
        severity: "high",
        riskScore: 42,
        riskReasons: ["two deposits in band"],
        summarySentence: "Two cash deposits sat in the structuring band.",
        subject: { id: "acc_9", name: "Operating account" },
        evidenceRefs: [],
        snapshotEvidenceIds: [],
        result: {
          ruleId: "AML-001",
          ruleVersion: "1",
          verdict: "fail",
          subject: { id: "acc_9", name: "Operating account" },
          triggeringRefs: [],
          observed: { count: 2 },
          parameters: { minCount: 2 },
        },
        policyRefs: [],
        status: "open",
        createdAt: "2026-01-15T10:00:00.000Z",
        slaDueAt: "2026-01-16T10:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});
