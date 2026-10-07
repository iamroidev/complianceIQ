import { NextRequest } from "next/server";
import { buildAuditPack } from "@/core/reports/audit-pack";
import { errorResponse, ok, roleOf } from "../../_http";
import { getState } from "../../_state";

const EPOCH = "1970-01-01T00:00:00.000Z";
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * §7.7 audit pack (every role may export): deterministic bundle + CSV + PDF,
 * pack hash recorded on the ledger. Query params: from, to, domains (CSV).
 */
export async function POST(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const params = new URL(request.url).searchParams;
    const rawFrom = params.get("from");
    const rawTo = params.get("to");
    const from = rawFrom && ISO_PATTERN.test(rawFrom) ? rawFrom : EPOCH;
    const to = rawTo && ISO_PATTERN.test(rawTo) ? rawTo : state.clock.now();
    const rawDomains = params.get("domains");
    const domains = rawDomains
      ? rawDomains.split(",").map((domain) => domain.trim()).filter(Boolean)
      : undefined;

    const pack = await buildAuditPack(
      { from, to, ...(domains ? { domains } : {}), generatedBy: "audit-pack" },
      {
        ledger: state.ledger,
        clock: state.clock,
        alerts: state.repo.alerts.list(),
        checkRuns: state.repo.checkRuns.list(),
        evidence: state.repo.evidence.list(),
        obligations: state.registers.obligations,
      },
    );

    return ok({
      packHash: pack.packHash,
      ledgerBlockIndex: pack.ledgerBlockIndex,
      generatedAt: pack.bundle.scope.generatedAt,
      method: pack.bundle.scope.methodStatement,
      bundle: pack.bundle,
      csv: pack.csv,
      pdfBase64: pack.pdfBase64,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
