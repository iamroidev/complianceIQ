import { describe, it, expect } from "vitest";
import { dev001 } from "../../src/core/engine/rules/event/dev-001";
import { shannonEntropy } from "../../src/core/engine/entropy";
import type { ComplianceEvent } from "../../src/core/types";
import { OWUSU, makeCtx, makeEvent, purityProbe } from "./engine-fixture";

const AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
const GENERIC_KEY = "dummy_generic_api_key_for_entropy_testing_sample_987654321";

const commit = (scannedText?: string, id = "evt_commit"): ComplianceEvent =>
  makeEvent({
    id,
    action: "commit_code",
    actor: OWUSU,
    resource: { type: "service", id: "svc-payments", label: "payments-api" },
    context: scannedText === undefined ? {} : { scannedText },
    timestamp: "2026-02-20T10:00:00.000Z",
  });

describe("DEV-001 hardcoded secret", () => {
  it("fails on an AWS secret key and summarises the entropy", () => {
    const ctx = makeCtx({ events: [commit(`aws_secret_access_key = "${AWS_SECRET}";`)] });
    const [result] = dev001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ provider: "AWS secret access key" });
    const entropy = Math.round(shannonEntropy(AWS_SECRET) * 10) / 10;
    expect(dev001.summarize(result)).toBe(
      `Commit payments-api contains a hardcoded AWS secret access key with entropy ${entropy}, above the 3.5 threshold.`,
    );
  });

  it("fails on an AWS access key id", () => {
    const ctx = makeCtx({ events: [commit(`key: "${AWS_KEY}"`)] });
    const [result] = dev001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.provider).toBe("AWS access key");
  });

  it("fails on a generic API key assignment", () => {
    const ctx = makeCtx({ events: [commit(`api_key = "${GENERIC_KEY}"`)] });
    const [result] = dev001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.provider).toBe("generic API key");
  });

  it("passes an AWS key id with very low entropy", () => {
    const ctx = makeCtx({ events: [commit(`key: "AKIAAAAAAAAAAAAAAAAA"`)] });
    const [result] = dev001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(dev001.summarize(result)).toBe(
      "No hardcoded secret found in commit payments-api.",
    );
  });

  it("passes when the commit text has no secret patterns", () => {
    const ctx = makeCtx({
      events: [commit("fix: clarify retry handling for the payout webhook")],
    });
    expect(dev001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("skips commits without scanned text", () => {
    const ctx = makeCtx({ events: [commit(undefined)] });
    expect(dev001.evaluate(ctx)).toEqual([]);
  });

  it("passes with a raised entropy threshold (boundary override)", () => {
    const ctx = makeCtx({ events: [commit(`aws_secret_access_key = "${AWS_SECRET}";`)] });
    const [result] = dev001.evaluate(ctx, { entropyThreshold: 99 });
    expect(result.verdict).toBe("pass");
    expect(result.parameters.entropyThreshold).toBe(99);
  });

  it("fails with a zero entropy threshold when a pattern still matches", () => {
    const ctx = makeCtx({ events: [commit(`key: "AKIAAAAAAAAAAAAAAAAA"`)] });
    expect(dev001.evaluate(ctx, { entropyThreshold: 0 })[0].verdict).toBe("fail");
  });

  it("skips low-entropy matches and takes the first real finding", () => {
    const ctx = makeCtx({
      events: [commit(`ak = "AKIA111111111111EXAMPLE2"; aws_secret_access_key = "${AWS_SECRET}"`)],
    });
    const probe = purityProbe(dev001, ctx);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
    expect(probe.first[0].observed.provider).toBe("AWS secret access key");
  });
});
