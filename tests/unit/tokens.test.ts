import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tokens = readFileSync(
  join(__dirname, "../../src/styles/tokens.css"),
  "utf8",
);

describe("tokens.css", () => {
  it("defines the default 60/30/10 theme colours (Mist)", () => {
    expect(tokens).toContain("--bg: #f2f5f9");
    expect(tokens).toContain("--accent: #1d4e89");
    expect(tokens).toContain("--cta: #d64045");
    expect(tokens).toContain("--critical: #d22f35");
  });

  it("keeps the butter palette selectable", () => {
    expect(tokens).toContain("[data-theme=\"butter\"]");
    expect(tokens).toContain("--bg: #fefad4");
  });

  it("keeps every solid red button at WCAG AA against white text", () => {
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return (
        0.2126 * lin((n >> 16) & 255) +
        0.7152 * lin((n >> 8) & 255) +
        0.0722 * lin(n & 255)
      );
    };
    const solids = [...tokens.matchAll(/--cta-solid:\s*(#[0-9a-fA-F]{6})/g)].map(
      (m) => m[1],
    );
    expect(solids.length).toBeGreaterThanOrEqual(5);
    for (const hex of solids) {
      const ratio = 1.05 / (luminance(hex) + 0.05);
      expect(ratio, `${hex} vs white`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps verified green separate from red", () => {
    expect(tokens).toContain("--verified: #0f6b5e");
  });

  it("defines illustration and motion tokens", () => {
    for (const token of [
      "--ill-ink",
      "--ill-teal",
      "--ill-terracotta",
      "--ease-out",
      "--ease-spring",
      "--dur-base",
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it("defines a dark theme", () => {
    expect(tokens).toContain("[data-theme=\"dark\"]");
  });
});
