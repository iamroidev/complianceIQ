import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * DESIGN §30.1 contrast gate.
 *
 *   body + meta text >= 7:1   large text and UI parts >= 4.5:1
 *
 * Parses `src/styles/tokens.css`, rebuilds every theme (the root palette plus
 * each `[data-theme]` overlay, and the `[data-contrast="high"]` overlay) and
 * measures the pairs that matter. `--text-3` is checked only as a floor
 * (§30.1: it survives for disabled controls and decorative icons, never text).
 *
 * Run directly for a report (`pnpm exec tsx scripts/check-contrast.ts`) or
 * through `tests/unit/contrast.test.ts`, which fails the build when a pair
 * drops under its threshold.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
export const TOKENS_PATH = resolve(HERE, "../src/styles/tokens.css");

export interface ContrastResult {
  theme: string;
  label: string;
  pair: string;
  ratio: number;
  min: number;
  pass: boolean;
}

/** Text that people must read: §30.1 requires 7:1. */
const TEXT_TOKENS = [
  "--text",
  "--text-2",
  "--critical-text",
  "--high-text",
  "--ok-text",
  "--info-text",
];

/** Surfaces those tokens appear on. */
const LIGHT_SURFACES = ["--bg", "--surface", "--surface-2"];

/** Words and parts that are not body copy but still must be legible. */
const UI_TOKENS: Array<[string, number]> = [
  ["--nav-text", 7],
  ["--nav-text-2", 4.5],
  ["--on-cta", 4.5],
  ["--on-accent", 4.5],
  ["--verified", 4.5],
  ["--accent", 4.5],
  ["--critical", 4.5],
  ["--high", 4.5],
  ["--medium", 4.5],
  ["--text-3", 3],
];

/** Surfaces the UI parts sit on, per part. */
const UI_SURFACES: Record<string, string[]> = {
  "--nav-text": ["--nav-bg"],
  "--nav-text-2": ["--nav-bg"],
  "--on-cta": ["--cta-solid"],
  "--on-accent": ["--accent"],
  "--verified": ["--surface", "--bg"],
  "--accent": ["--surface", "--bg"],
  "--critical": ["--surface", "--bg"],
  "--high": ["--surface", "--bg"],
  "--medium": ["--surface", "--bg"],
  "--text-3": ["--surface", "--bg"],
};

export function luminance(hex: string): number {
  const c = hex.replace("#", "").trim();
  const full = c.length === 3 ? c.split("").map((s) => s + s).join("") : c;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = channels.map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Strip comments, then pull the declarations out of each block we care about. */
function parseBlocks(css: string): Array<{ selector: string; vars: Record<string, string> }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: Array<{ selector: string; vars: Record<string, string> }> = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const selector = m[1].trim();
    const vars: Record<string, string> = {};
    for (const decl of m[2].split(";")) {
      const idx = decl.indexOf(":");
      if (idx === -1) continue;
      const name = decl.slice(0, idx).trim();
      const value = decl.slice(idx + 1).trim();
      if (name.startsWith("--")) vars[name] = value;
    }
    if (Object.keys(vars).length) blocks.push({ selector, vars });
  }
  return blocks;
}

export function loadThemes(css = readFileSync(TOKENS_PATH, "utf8")): Record<string, Record<string, string>> {
  const blocks = parseBlocks(css);
  const themes: Record<string, Record<string, string>> = {};
  let root: Record<string, string> = {};
  const overlays: Record<string, Record<string, string>> = {};
  const high: Record<string, string> = {};

  for (const { selector, vars } of blocks) {
    if (selector === ":root") {
      root = { ...root, ...vars };
      continue;
    }
    const theme = selector.match(/\[data-theme="([^"]+)"\]/);
    if (theme) {
      overlays[theme[1]] = { ...(overlays[theme[1]] ?? {}), ...vars };
      continue;
    }
    if (selector.includes('[data-contrast="high"]')) Object.assign(high, vars);
  }

  for (const [name, vars] of Object.entries(overlays)) themes[name] = { ...root, ...vars };
  themes["mist"] = root; // the default palette
  themes["high-contrast"] = { ...root, ...high };
  return themes;
}

export function checkContrast(css?: string): ContrastResult[] {
  const themes = loadThemes(css);
  const results: ContrastResult[] = [];

  for (const [theme, vars] of Object.entries(themes)) {
    const resolve = (token: string): string | undefined => vars[token];
    const surfaces = LIGHT_SURFACES.map((s) => [s, resolve(s)] as const).filter(([, v]) => !!v);

    for (const token of TEXT_TOKENS) {
      const fg = resolve(token);
      if (!fg || !fg.startsWith("#")) continue;
      for (const [surfaceToken, bg] of surfaces) {
        if (!bg?.startsWith("#")) continue;
        const ratio = contrastRatio(fg, bg);
        results.push({
          theme,
          label: `${token} text`,
          pair: `${token} on ${surfaceToken}`,
          ratio,
          min: 7,
          pass: ratio >= 7,
        });
      }
    }

    for (const [token, min] of UI_TOKENS) {
      const fg = resolve(token);
      if (!fg || !fg.startsWith("#")) continue;
      for (const surfaceToken of UI_SURFACES[token] ?? []) {
        const bg = resolve(surfaceToken);
        if (!bg?.startsWith("#")) continue;
        const ratio = contrastRatio(fg, bg);
        results.push({
          theme,
          label: `${token} ui`,
          pair: `${token} on ${surfaceToken}`,
          ratio,
          min,
          pass: ratio >= min,
        });
      }
    }
  }

  return results;
}

export function failures(results = checkContrast()): ContrastResult[] {
  return results.filter((r) => !r.pass);
}

export function formatReport(results: ContrastResult[]): string {
  const fail = failures(results);
  const lines = [`contrast: ${results.length - fail.length}/${results.length} pairs pass`];
  for (const f of fail) {
    lines.push(`  ✗ ${f.theme}: ${f.pair} = ${f.ratio.toFixed(2)} (need ${f.min})`);
  }
  return lines.join("\n");
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const results = checkContrast();
  console.log(formatReport(results));
  process.exit(failures(results).length ? 1 : 0);
}
