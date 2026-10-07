import { describe, it, expect } from "vitest";
import { hipaa001 } from "../../src/core/engine/rules/event/hipaa-001";
import type { ComplianceEvent } from "../../src/core/types";
import { DANIEL, OWUSU, makeCtx, makeEvent, purityProbe } from "./engine-fixture";

const view = (
  actor: ComplianceEvent["actor"],
  attributes?: Record<string, unknown>,
  context?: Record<string, unknown>,
  id = "evt_view",
): ComplianceEvent =>
  makeEvent({
    id,
    action: "view_record",
    actor,
    resource: {
      type: "record",
      id: "rec_9",
      label: "Patient record rec_9",
      ...(attributes ? { attributes } : {}),
    },
    context: context ?? {},
  });

describe("HIPAA-001 restricted record access", () => {
  it("fails when a non-care-team member views a restricted record", () => {
    const ctx = makeCtx({
      events: [view(DANIEL, { restricted: true, careTeam: ["p_kwesi", "p_ama"] })],
    });
    const [result] = hipaa001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ restricted: true, onCareTeam: false });
    expect(hipaa001.summarize(result)).toBe(
      "Daniel Aterah viewed the restricted record Patient record rec_9 and is not on the care team.",
    );
  });

  it("fails when the care team comes from the event context instead of attributes", () => {
    const ctx = makeCtx({
      events: [view(DANIEL, { restricted: true }, { careTeam: ["p_ama"] })],
    });
    const [result] = hipaa001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
  });

  it("fails when a restricted record has no care team at all", () => {
    const ctx = makeCtx({ events: [view(DANIEL, { restricted: true })] });
    expect(hipaa001.evaluate(ctx)[0].verdict).toBe("fail");
  });

  it("passes when the viewer is on the care team", () => {
    const ctx = makeCtx({
      events: [view(OWUSU, { restricted: true, careTeam: ["p_kwesi", "p_owusu"] })],
    });
    const [result] = hipaa001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(hipaa001.summarize(result)).toBe(
      "A. Owusu is on the care team for Patient record rec_9.",
    );
  });

  it("passes when the record is not restricted", () => {
    const ctx = makeCtx({
      events: [view(DANIEL, { restricted: false, careTeam: ["p_kwesi"] })],
    });
    const [result] = hipaa001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(hipaa001.summarize(result)).toBe(
      "Daniel Aterah viewed Patient record rec_9, which is not marked restricted.",
    );
  });

  it("passes when the restricted flag is absent", () => {
    const ctx = makeCtx({ events: [view(DANIEL, { careTeam: ["p_kwesi"] })] });
    expect(hipaa001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("respects a custom restricted flag parameter", () => {
    const ctx = makeCtx({ events: [view(DANIEL, { sensitivity: "high", careTeam: [] })] });
    expect(hipaa001.evaluate(ctx, { restrictedFlag: "sensitivity" })[0].verdict).toBe("pass");
    expect(
      hipaa001.evaluate(ctx, { restrictedFlag: "restricted" })[0].verdict,
    ).toBe("pass");
    const strict = makeCtx({
      events: [
        view(DANIEL, { sensitivity: true, careTeam: [] }, {}, "evt_custom"),
      ],
    });
    const [result] = hipaa001.evaluate(strict, { restrictedFlag: "sensitivity" });
    expect(result.verdict).toBe("fail");
  });

  it("ignores events that are not record views", () => {
    const ctx = makeCtx({
      events: [makeEvent({ action: "cash_deposit", resource: { type: "record", id: "rec_9" } })],
    });
    expect(hipaa001.evaluate(ctx)).toEqual([]);
  });

  it("is deterministic and never mutates the context", () => {
    const ctx = makeCtx({
      events: [view(DANIEL, { restricted: true, careTeam: ["p_kwesi"] })],
    });
    const probe = purityProbe(hipaa001, ctx);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });
});
