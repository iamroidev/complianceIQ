import { Landing } from "@/components/landing/Landing";
import type { LandingFacts } from "@/components/landing/content";
import { getState } from "@/app/api/_state";
import { computeCoverage, derivePassingChecks } from "@/core/coverage/compute";
import { TIER1_RULES } from "@/core/engine/rules";
import { loadCorpus } from "@/core/rag/corpus";
import { landingFontPreloads } from "@/app/font-preloads";

/** Facts are read from the live demo state (§19.2: honest, counted values). */
export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await getState();
  const obligations = state.registers.obligations;
  const openAlerts = state.repo.alerts.list().filter((alert) => alert.status === "open");
  const checkRuns = state.repo.checkRuns.list();
  const lastRun = checkRuns[checkRuns.length - 1];
  const passingChecks = derivePassingChecks(
    obligations,
    new Set(openAlerts.map((alert) => alert.ruleId)),
    lastRun?.asOf,
  );
  const items = computeCoverage({
    obligations,
    passingChecks,
    asOf: state.clock.now(),
  });

  const facts: LandingFacts = {
    policies: loadCorpus().documents.length,
    obligations: obligations.length,
    rules: TIER1_RULES.length,
    entries: state.ledger.blocks.length,
    checked: items.filter((item) => item.status !== "gap").length,
    coverageTotal: items.length,
  };

  return (
    <>
      {landingFontPreloads().map((font) => (
        <link
          key={font.href}
          rel="preload"
          as="font"
          type={`font/${font.ext}`}
          href={font.href}
          crossOrigin=""
          fetchPriority="high"
        />
      ))}
      <Landing facts={facts} />
    </>
  );
}
