import { describe, expect, it } from "vitest";
import { checkContrast, contrastRatio, failures, loadThemes, TOKENS_PATH } from "../../scripts/check-contrast";

/**
 * DESIGN §30.1: body and meta text >= 7:1, large text and UI parts >= 4.5:1,
 * across every palette (mist, butter, paper, sand, dark, high contrast).
 */
describe("DESIGN 30.1 contrast gate", () => {
  it("loads every theme from tokens.css", () => {
    const themes = loadThemes();
    for (const name of ["mist", "butter", "paper", "sand", "dark", "high-contrast"]) {
      expect(Object.keys(themes)).toContain(name);
      expect(themes[name]["--text"]).toBeTruthy();
      expect(themes[name]["--surface"]).toBeTruthy();
    }
    expect(TOKENS_PATH).toContain("tokens.css");
  });

  it("measures WCAG ratios correctly", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#14171a", "#ffffff")).toBeGreaterThan(15);
  });

  it("passes every text and UI pair in every theme", () => {
    const results = checkContrast();
    expect(results.length).toBeGreaterThan(100); // the gate actually ran
    const fail = failures(results);
    const report = fail.map((f) => `${f.theme}: ${f.pair} = ${f.ratio.toFixed(2)} (need ${f.min})`).join("\n");
    expect(report).toBe("");
  });
});
