import { describe, it, expect } from "vitest";
import { pickReduceMotion } from "../../src/lib/reduceMotion";

describe("reduce-motion preference", () => {
  it("prefers the URL override over saved and OS", () => {
    expect(
      pickReduceMotion({ url: "reduce", stored: "off", system: false }),
    ).toBe(true);
    expect(
      pickReduceMotion({ url: "full", stored: "on", system: true }),
    ).toBe(false);
  });

  it("prefers the saved choice over the OS setting", () => {
    expect(pickReduceMotion({ url: null, stored: "on", system: false })).toBe(true);
    expect(pickReduceMotion({ url: null, stored: "off", system: true })).toBe(false);
  });

  it("falls back to the OS setting", () => {
    expect(pickReduceMotion({ url: null, stored: null, system: true })).toBe(true);
    expect(pickReduceMotion({ url: null, stored: null, system: false })).toBe(false);
  });

  it("ignores unknown URL or saved values", () => {
    expect(
      pickReduceMotion({ url: "yes", stored: "maybe", system: true }),
    ).toBe(true);
    expect(
      pickReduceMotion({ url: "yes", stored: "maybe", system: false }),
    ).toBe(false);
  });
});
