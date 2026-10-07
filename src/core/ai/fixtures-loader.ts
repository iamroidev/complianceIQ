import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DossierKind } from "../types";
import { RawExtracted, RawGapSuggestion, RawParagraph, RawPriorityOrder } from "./raw";

export const AiFixture = z.object({
  scenarioId: z.string().min(1),
  ruleId: z.string().min(1),
  subjectId: z.string().min(1),
  explanation: z.array(RawParagraph).min(1),
  draft: z.object({
    kind: DossierKind,
    paragraphs: z.array(RawParagraph).min(1),
  }),
});

export type AiFixture = z.infer<typeof AiFixture>;

export function fixtureKey(ruleId: string, subjectId: string): string {
  return `${ruleId}:${subjectId}`;
}

function fixturesDir(): string {
  return path.join(process.cwd(), "src", "data", "fixtures", "ai");
}

function readJsonIfPresent<T>(file: string, schema: z.ZodType<T>): T | undefined {
  if (!existsSync(file)) return undefined;
  return schema.parse(JSON.parse(readFileSync(file, "utf8")));
}

/** §7.4 C — fixture per document id, in the `extract/` subfolder. */
export function loadExtractFixture(
  documentId: string,
  dir: string = fixturesDir(),
): RawExtracted | undefined {
  return readJsonIfPresent(path.join(dir, "extract", `${documentId}.json`), RawExtracted);
}

/** §7.4 E — fixture per obligation id, in the `gap/` subfolder. */
export function loadGapFixture(
  obligationId: string,
  dir: string = fixturesDir(),
): RawGapSuggestion | undefined {
  return readJsonIfPresent(path.join(dir, "gap", `${obligationId}.json`), RawGapSuggestion);
}

/**
 * §7.4 F — the fixture only applies to the exact alert-id set it was written
 * for (a mismatch falls back to score order rather than inventing ranks).
 */
export function loadPriorityFixture(
  alertIds: readonly string[],
  dir: string = fixturesDir(),
): RawPriorityOrder | undefined {
  const fixture = readJsonIfPresent(
    path.join(dir, "priority", "order.json"),
    z.object({ alertIds: z.array(z.string().min(1)), order: RawPriorityOrder.shape.order }),
  );
  if (!fixture) return undefined;
  const wanted = [...alertIds].sort();
  const known = [...fixture.alertIds].sort();
  if (wanted.length !== known.length || wanted.some((id, index) => id !== known[index])) {
    return undefined;
  }
  return { order: fixture.order };
}

/**
 * Loads the pre-generated, pre-validated AI outputs (§7.4): one JSON file
 * per entry, keyed by rule + subject so any alert can find its fixture.
 * Duplicate keys are a hard error — two scenarios must never race for an
 * alert's text.
 */
export function loadAiFixtures(dir: string = fixturesDir()): Map<string, AiFixture> {
  const fixtures = new Map<string, AiFixture>();
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  for (const file of files) {
    const fixture = AiFixture.parse(JSON.parse(readFileSync(path.join(dir, file), "utf8")));
    const key = fixtureKey(fixture.ruleId, fixture.subjectId);
    if (fixtures.has(key)) throw new Error(`Duplicate AI fixture key ${key} in ${file}`);
    fixtures.set(key, fixture);
  }
  return fixtures;
}
