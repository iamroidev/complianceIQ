import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type FontPreload = { href: string; ext: string };

/**
 * next/font only emits `<link rel="preload">` tags into the initial HTML for
 * statically rendered routes; force-dynamic routes receive them as flight
 * `:HL` hints that apply at hydration — far too late for LCP (vercel/next.js#62332).
 * Read the build's font manifest and pre-emit the tags ourselves.
 *
 * GeistMono is excluded: nothing on the landing page uses it and a forced
 * 70KB download would compete with the fonts that do back the LCP element.
 */
export function landingFontPreloads(): FontPreload[] {
  try {
    const root = process.cwd();
    const manifest = JSON.parse(
      readFileSync(join(root, ".next", "server", "next-font-manifest.json"), "utf8"),
    ) as { app?: Record<string, string[]> };
    const layoutKey = Object.keys(manifest.app ?? {}).find((key) =>
      key.replace(/\\/g, "/").endsWith("/app/layout"),
    );
    const files = layoutKey ? manifest.app![layoutKey] : [];

    const cssDir = join(root, ".next", "static", "css");
    const css = readdirSync(cssDir)
      .filter((file) => file.endsWith(".css"))
      .map((file) => readFileSync(join(cssDir, file), "utf8"))
      .join("");
    const monoFiles = new Set(
      [...css.matchAll(/@font-face\{([^}]+)\}/g)]
        .filter((match) => /font-family:[^;]*Mono/i.test(match[1]))
        .map((match) => match[1].match(/url\(\/_next\/static\/media\/([^)]+)\)/)?.[1])
        .filter((file): file is string => Boolean(file)),
    );

    return files
      .filter((file) => !monoFiles.has(file.split("/").pop() ?? ""))
      .map((file) => ({ href: `/_next/${file}`, ext: file.split(".").pop() ?? "woff2" }));
  } catch {
    return [];
  }
}
