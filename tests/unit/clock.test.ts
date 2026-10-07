import { describe, it, expect } from "vitest";
import {
  FakeClock,
  SystemClock,
  assertIsoUtcMs,
  isIsoUtcMs,
} from "../../src/core/clock";

describe("clock", () => {
  it("SystemClock emits ISO-8601 UTC ms", () => {
    expect(isIsoUtcMs(new SystemClock().now())).toBe(true);
  });

  it("FakeClock starts fixed and advances deterministically", () => {
    const clock = new FakeClock("2026-01-15T10:00:00.000Z");
    expect(clock.now()).toBe("2026-01-15T10:00:00.000Z");
    clock.advance(1_500);
    expect(clock.now()).toBe("2026-01-15T10:00:01.500Z");
    clock.advanceDays(1);
    expect(clock.now()).toBe("2026-01-16T10:00:01.500Z");
    clock.set("2026-03-01T00:00:00.000Z");
    expect(clock.now()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("validates every time it is given", () => {
    expect(() => new FakeClock("2026-01-15")).toThrow(/ISO-8601 UTC ms/);
    const clock = new FakeClock("2026-01-15T10:00:00.000Z");
    expect(() => clock.set("15/01/2026 10:00")).toThrow(/ISO-8601 UTC ms/);
    expect(() => clock.advance(Number.NaN)).toThrow(/finite/);
    expect(() => assertIsoUtcMs("2026-01-15T10:00:00+02:00", "offset time")).toThrow();
  });

  it("rejects near-miss formats", () => {
    expect(isIsoUtcMs("2026-01-15")).toBe(false);
    expect(isIsoUtcMs("2026-01-15T10:00:00Z")).toBe(false);
    expect(isIsoUtcMs("2026-01-15T10:00:00.000+01:00")).toBe(false);
    expect(isIsoUtcMs(20260115)).toBe(false);
    expect(isIsoUtcMs(null)).toBe(false);
  });
});
