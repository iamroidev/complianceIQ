import fs from "node:fs";
import path from "node:path";

/**
 * Audit script for DESIGN.md §22 ("Scale and fill")
 * Checks that:
 * 1. No `max-w-*` or `mx-auto` containers exist in `src/app/(app)` or `src/components/workspace`.
 * 2. No `text-xs` (12px) utility classes exist in workspace components (minimum text size is 13px per §22).
 * 3. Typography tokens and root font sizes are defined properly in tokens.css and globals.css.
 */

interface Violation {
  file: string;
  line: number;
  issue: string;
  snippet: string;
}

const VIOLATIONS: Violation[] = [];

function checkFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for max-w-* utility classes on containers (excluding max-w-prose / max-w-ch which are allowed for prose)
    if (/class(?:Name)?=["'][^"']*\bmax-w-(?!prose|screen|none|fit)\w+[^"']*["']/.test(line)) {
      VIOLATIONS.push({
        file: filePath,
        line: lineNum,
        issue: "Contains max-w-* container restriction violating §22 (fill-the-screen)",
        snippet: line.trim(),
      });
    }

    // Check for mx-auto container centering
    if (/class(?:Name)?=["'][^"']*\bmx-auto\b[^"']*["']/.test(line)) {
      VIOLATIONS.push({
        file: filePath,
        line: lineNum,
        issue: "Contains mx-auto container centering violating §22 (fill-the-screen)",
        snippet: line.trim(),
      });
    }

    // Check for text-xs (12px font) which violates the 13px minimum
    if (/class(?:Name)?=["'][^"']*\btext-xs\b[^"']*["']/.test(line)) {
      // Allow if specifically targeting hashes or mono IDs
      if (!line.includes("mono") && !line.includes("hash")) {
        VIOLATIONS.push({
          file: filePath,
          line: lineNum,
          issue: "Contains text-xs (12px) violating §22 (nothing smaller than 13px except mono hashes)",
          snippet: line.trim(),
        });
      }
    }
  });
}

function walkDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      checkFile(fullPath);
    }
  }
}

console.log("=== Auditing codebase against DESIGN.md §22 (Scale and fill) ===\n");

// Check (app) pages and workspace components
const targets = [
  path.join(process.cwd(), "src/app/(app)"),
  path.join(process.cwd(), "src/components/workspace"),
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    walkDir(target);
  }
}

// Verify tokens.css
const tokensPath = path.join(process.cwd(), "src/styles/tokens.css");
const tokensContent = fs.readFileSync(tokensPath, "utf8");
const requiredTokens = [
  "--nav-w: 248px",
  "--topbar-h: 64px",
  "--row-h: 52px",
  "--btn-h: 44px",
  "--btn-h-primary: 48px",
  "--input-h: 44px",
  "--cell-pad: 14px 20px",
];

for (const tok of requiredTokens) {
  if (!tokensContent.includes(tok)) {
    VIOLATIONS.push({
      file: tokensPath,
      line: 1,
      issue: `Missing required scale token '${tok}' in tokens.css`,
      snippet: tok,
    });
  }
}

// Verify globals.css root breakpoints
const globalsPath = path.join(process.cwd(), "src/app/globals.css");
const globalsContent = fs.readFileSync(globalsPath, "utf8");
if (!globalsContent.includes("17.5px") || !globalsContent.includes("19px")) {
  VIOLATIONS.push({
    file: globalsPath,
    line: 1,
    issue: "Missing root font-size breakpoints (17.5px @ 1680px, 19px @ 1920px) in globals.css",
    snippet: "html font-size breakpoints",
  });
}

if (VIOLATIONS.length > 0) {
  console.error(`Found ${VIOLATIONS.length} scale violation(s):\n`);
  for (const v of VIOLATIONS) {
    console.error(`  ${path.relative(process.cwd(), v.file)}:${v.line}`);
    console.error(`    Issue: ${v.issue}`);
    console.error(`    Code:  ${v.snippet}\n`);
  }
  process.exit(1);
} else {
  console.log("✓ All scale checks passed! No max-w wrappers, no forbidden text-xs, tokens and root breakpoints verified.\n");
  process.exit(0);
}
