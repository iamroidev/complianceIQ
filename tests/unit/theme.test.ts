import { describe, it, expect } from "vitest";
import {
  THEME_IDS,
  THEME_NAMES,
  THEME_SWATCHES,
  isThemeId,
} from "../../src/lib/theme";

describe("theme lib", () => {
  it("exposes exactly the five palettes", () => {
    expect(THEME_IDS).toEqual(["mist", "butter", "paper", "sand", "dark"]);
  });

  it("validates ids", () => {
    for (const id of THEME_IDS) expect(isThemeId(id)).toBe(true);
    expect(isThemeId("light")).toBe(false);
    expect(isThemeId("solarized")).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });

  it("names and chips every palette", () => {
    for (const id of THEME_IDS) {
      expect(THEME_NAMES[id]).toBeTruthy();
      expect(THEME_SWATCHES[id].canvas).toMatch(/^#[0-9A-F]{6}$/);
      expect(THEME_SWATCHES[id].structure).toMatch(/^#[0-9A-F]{6}$/);
      expect(THEME_SWATCHES[id].accent).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
