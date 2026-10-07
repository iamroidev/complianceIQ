import { NextRequest } from "next/server";
import { canonical, headHash, sha256hex, verifyChain } from "@/core/ledger";
import { errorResponse, ok, roleOf } from "../../_http";
import { getState } from "../../_state";

/**
 * §7.6 / §9 tamper check (every role): every stored hash is recomputed —
 * payload and current hash per block, linkage, contiguity, timestamps, and
 * each evidence item against its ledger payload plus a fresh re-hash of its
 * content. Reports the exact first broken index when something fails.
 */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const blocks = state.ledger.blocks;
    const evidence = state.repo.evidence.list();
    const chain = verifyChain(blocks, evidence);

    const evidenceRows = evidence.map((item) => {
      const block = blocks[item.ledgerBlockIndex];
      const payloadHash =
        block && block.eventType === "EVIDENCE_RECORDED"
          ? (block.payload["contentHash"] as string | undefined) ?? null
          : null;
      const rederivedHash =
        item.content === undefined ? null : sha256hex(canonical(item.content));
      return {
        id: item.id,
        storedHash: item.contentHash,
        ledgerBlockIndex: item.ledgerBlockIndex,
        payloadMatches: payloadHash === item.contentHash,
        rederivedHash,
        rederivedMatches: rederivedHash === null ? null : rederivedHash === item.contentHash,
      };
    });
    const evidenceContentOk = evidenceRows.every(
      (row) => row.payloadMatches && (row.rederivedMatches === null || row.rederivedMatches),
    );

    return ok({
      ok: chain.ok && evidenceContentOk,
      chain,
      evidence: evidenceRows,
      headHash: headHash(blocks),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
