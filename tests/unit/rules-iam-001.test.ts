import { describe, it, expect } from "vitest";
import { iam001 } from "../../src/core/engine/rules/event/iam-001";
import type { ComplianceEvent } from "../../src/core/types";
import { OWUSU, DANIEL, makeCtx, makeEvent, purityProbe } from "./engine-fixture";

const commit = (timestamp: string, id: string): ComplianceEvent =>
  makeEvent({
    id,
    action: "commit_code",
    actor: OWUSU,
    resource: { type: "service", id: "svc-payments", label: "payments-api" },
    timestamp,
  });

const deploy = (timestamp: string, id: string, approvedBy?: string): ComplianceEvent =>
  makeEvent({
    id,
    action: "deploy_prod",
    actor: OWUSU,
    resource: { type: "environment", id: "svc-deploy-prod", label: "svc-deploy-prod" },
    context: approvedBy ? { approvedBy } : {},
    timestamp,
  });

describe("IAM-001 separation of duties", () => {
  it("fails same-day commit and unapproved deploy, 3 hours apart", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c1"),
        deploy("2026-02-10T13:00:00.000Z", "evt_d1"),
      ],
    });
    const [result] = iam001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({
      actorName: "A. Owusu",
      hoursApart: 3,
      commitRef: "payments-api",
      deployRef: "svc-deploy-prod",
    });
    expect(iam001.summarize(result)).toBe(
      "A. Owusu committed code (payments-api) and deployed to production (svc-deploy-prod) 3 hours apart without a second approver.",
    );
  });

  it("fails when the deploy is approved by the same actor", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c2"),
        deploy("2026-02-10T14:00:00.000Z", "evt_d2", OWUSU.id),
      ],
    });
    expect(iam001.evaluate(ctx)[0].verdict).toBe("fail");
  });

  it("fails at exactly 24 hours apart (inclusive edge)", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c3"),
        deploy("2026-02-11T10:00:00.000Z", "evt_d3"),
      ],
    });
    const [result] = iam001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.hoursApart).toBe(24);
  });

  it("passes with a distinct second approver on the deploy", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c4"),
        deploy("2026-02-10T13:00:00.000Z", "evt_d4", DANIEL.id),
      ],
    });
    const [result] = iam001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(result.triggeringRefs).toEqual([]);
    expect(iam001.summarize(result)).toBe(
      "A. Owusu had no unapproved commit-and-deploy pair inside the 24-hour window.",
    );
  });

  it("passes when the pair is 25 hours apart (outside the window)", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c5"),
        deploy("2026-02-11T11:00:00.000Z", "evt_d5"),
      ],
    });
    expect(iam001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("evaluates nothing when the actor only committed code", () => {
    const ctx = makeCtx({ events: [commit("2026-02-10T10:00:00.000Z", "evt_c6")] });
    expect(iam001.evaluate(ctx)).toEqual([]);
  });

  it("evaluates nothing when commit and deploy come from different actors", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c7"),
        makeEvent({
          id: "evt_d7",
          action: "deploy_prod",
          actor: DANIEL,
          resource: { type: "environment", id: "svc-deploy-prod", label: "svc-deploy-prod" },
          timestamp: "2026-02-10T13:00:00.000Z",
        }),
      ],
    });
    expect(iam001.evaluate(ctx)).toEqual([]);
  });

  it("passes when the deploy lands before the commit (ordering is required)", () => {
    const ctx = makeCtx({
      events: [
        deploy("2026-02-10T13:00:00.000Z", "evt_d8"),
        commit("2026-02-10T14:00:00.000Z", "evt_c8"),
      ],
    });
    expect(iam001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("is deterministic and never mutates the context", () => {
    const ctx = makeCtx({
      events: [
        commit("2026-02-10T10:00:00.000Z", "evt_c9"),
        deploy("2026-02-10T13:00:00.000Z", "evt_d9"),
      ],
    });
    const probe = purityProbe(iam001, ctx);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });
});
