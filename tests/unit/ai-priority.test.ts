import { describe, expect, it } from "vitest";
import { suggestOrder } from "../../src/core/ai/priority";
import { loadPriorityFixture } from "../../src/core/ai/fixtures-loader";
import { buildPriorityFacts } from "../../src/core/ai/facts";
import { validatePriorityOrder } from "../../src/core/ai/validators";
import { stateAlerts, T0 } from "./ai-scenario-alerts";
import type { AiClient } from "../../src/core/ai/generate";
import type { AiPrompt } from "../../src/core/ai/prompts";
import type { Alert } from "../../src/core/types";

const ALERT_IDS = ["alrt_1", "alrt_3", "alrt_5"];
const SCORE_ORDER = ["alrt_5", "alrt_1", "alrt_3"];

describe("suggestOrder (§7.4 F)", () => {
  const alerts = stateAlerts(T0);
  const fixture = loadPriorityFixture(ALERT_IDS)!;

  it("the T0 alerts and the pre-generated fixture are in place", () => {
    expect(alerts.map((alert) => alert.id)).toEqual(ALERT_IDS);
    expect(fixture).toBeDefined();
    expect(fixture.order.map((entry) => entry.alertId)).toEqual(["alrt_3", "alrt_5", "alrt_1"]);
    expect(fixture.order.map((entry) => entry.alertId)).not.toEqual(SCORE_ORDER);
  });

  it("fixtures mode returns the pre-generated order with ranks 1..n", async () => {
    const suggestion = await suggestOrder(alerts, { mode: "fixtures", asOf: T0 });
    expect(suggestion.generatedBy).toBe("fixture");
    expect(suggestion.id).toBe("prs_alrt_1-alrt_3-alrt_5");
    expect(suggestion.generatedAt).toBe(T0);
    expect(suggestion.order.map((entry) => entry.alertId)).toEqual(["alrt_3", "alrt_5", "alrt_1"]);
    expect(suggestion.order.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(suggestion.order[0].reason).toBe(
      "Regulatory deadline is 9 days away and no completion evidence is recorded.",
    );
    expect(suggestion.order[1].citedFacts).toEqual([alerts[2].summarySentence]);
    expect(new Set(suggestion.order.map((entry) => entry.alertId)).size).toBe(3);
  });

  it("the fixture is valid against the supplied facts", () => {
    const facts = buildPriorityFacts(alerts, T0);
    expect(
      validatePriorityOrder(fixture.order, { alerts, factsText: facts }),
    ).toEqual([]);
  });

  it("a different alert set falls back to score order instead of inventing ranks", async () => {
    const subset = alerts.filter((alert) => alert.id !== "alrt_5");
    const suggestion = await suggestOrder(subset, { mode: "fixtures", asOf: T0 });
    expect(suggestion.generatedBy).toBe("score-order");
    expect(suggestion.order.map((entry) => entry.alertId)).toEqual(["alrt_1", "alrt_3"]);
    expect(suggestion.id).toBe("prs_alrt_1-alrt_3");
  });

  it("off mode is score then SLA then id, with the reason and cited facts in place", async () => {
    const suggestion = await suggestOrder(alerts, { mode: "off", asOf: T0 });
    expect(suggestion.generatedBy).toBe("score-order");
    expect(suggestion.order.map((entry) => entry.alertId)).toEqual(SCORE_ORDER);
    expect(suggestion.order.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(suggestion.order[0].reason).toBe(
      "Score 35 (high), review due by Mar 2, 09:00.",
    );
    expect(suggestion.order[0].citedFacts).toEqual([alerts[2].summarySentence]);
    expect(suggestion.generatedAt).toBe(T0);
    expect(
      validatePriorityOrder(
        suggestion.order.map(({ alertId, reason, citedFacts }) => ({ alertId, reason, citedFacts })),
        { alerts, factsText: buildPriorityFacts(alerts, T0) },
      ),
    ).toEqual([]);
  });

  it("an empty alert list yields an empty score order", async () => {
    const suggestion = await suggestOrder([], { mode: "off", asOf: T0 });
    expect(suggestion.generatedBy).toBe("score-order");
    expect(suggestion.id).toBe("prs_");
    expect(suggestion.order).toEqual([]);
  });

  it("live mode accepts a valid client response after one call", async () => {
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return JSON.stringify({ order: fixture.order });
    };
    const suggestion = await suggestOrder(alerts, { mode: "live", asOf: T0, client });
    expect(suggestion.generatedBy).toBe("kimi");
    expect(calls).toHaveLength(1);
    expect(calls[0].user).toContain("FACTS");
    expect(calls[0].user).toContain("alert alrt_5:");
    expect(suggestion.order.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("live mode retries once when the order invents an alert id", async () => {
    const bad = {
      order: [
        { alertId: "alrt_999", reason: "Looks urgent.", citedFacts: ["something"] },
      ],
    };
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return calls.length === 1 ? JSON.stringify(bad) : JSON.stringify({ order: fixture.order });
    };
    const suggestion = await suggestOrder(alerts, { mode: "live", asOf: T0, client });
    expect(suggestion.generatedBy).toBe("kimi");
    expect(calls).toHaveLength(2);
    expect(calls[1].user).toContain("failed validation");
    expect(calls[1].user).toContain("not part of the supplied alerts");
  });

  it("live mode falls back to score order after two invalid attempts", async () => {
    const bad = { order: [{ alertId: "alrt_999", reason: "Looks urgent.", citedFacts: ["something"] }] };
    const calls: AiPrompt[] = [];
    const client: AiClient = async (prompt) => {
      calls.push(prompt);
      return JSON.stringify(bad);
    };
    const suggestion = await suggestOrder(alerts, { mode: "live", asOf: T0, client });
    expect(calls).toHaveLength(2);
    expect(suggestion.generatedBy).toBe("score-order");
    expect(suggestion.order.map((entry) => entry.alertId)).toEqual(SCORE_ORDER);
  });
});

describe("validatePriorityOrder (§11)", () => {
  const alerts: Alert[] = stateAlerts(T0);
  const factsText = buildPriorityFacts(alerts, T0);
  const valid = [
    {
      alertId: "alrt_5",
      reason: "High-severity vendor document gap with the earliest review deadline.",
      citedFacts: [alerts[2].summarySentence],
    },
    {
      alertId: "alrt_1",
      reason: "Missing required certificate, risk score 25.",
      citedFacts: [alerts[0].summarySentence],
    },
    {
      alertId: "alrt_3",
      reason: "Regulatory deadline is 9 days away and no completion evidence is recorded.",
      citedFacts: [alerts[1].summarySentence],
    },
  ];
  const run = (order: typeof valid) => validatePriorityOrder(order, { alerts, factsText });

  it("accepts the pre-generated fixture order", () => {
    expect(run(loadPriorityFixture(ALERT_IDS)!.order)).toEqual([]);
  });

  it("rejects an alert id that was not supplied", () => {
    const issues = run([{ alertId: "alrt_999", reason: "Looks urgent.", citedFacts: [] }]);
    expect(issues.map((issue) => issue.code)).toContain("unknown_alert_id");
  });

  it("rejects an order that drops or repeats an alert", () => {
    const dropped = run([valid[0], valid[1]]);
    expect(dropped.map((issue) => issue.code)).toContain("incomplete_order");
    const repeated = run([valid[0], valid[1], valid[2], valid[0]]);
    expect(repeated.map((issue) => issue.code)).toEqual(["incomplete_order"]);
  });

  it("rejects a reason with a fabricated number", () => {
    const issues = run([{ ...valid[0], reason: "Risk score 42 is rising." }, valid[1], valid[2]]);
    expect(issues.map((issue) => issue.code)).toContain("fabricated_number");
  });

  it("rejects a reason with a forbidden phrase", () => {
    const issues = run([{ ...valid[0], reason: "Vendor is compliant with policy." }, valid[1], valid[2]]);
    expect(issues.map((issue) => issue.code)).toContain("forbidden_phrase");
  });

  it("rejects cited facts that are not in the supplied facts", () => {
    const issues = run([{ ...valid[0], citedFacts: ["The board met in secret."] }, valid[1], valid[2]]);
    expect(issues.map((issue) => issue.code)).toContain("unknown_fact");
  });
});
