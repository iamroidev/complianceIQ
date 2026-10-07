import { NextRequest } from "next/server";
import { canonical, sha256hex } from "@/core/ledger";
import { ApiError, errorResponse, ok, paramOf, roleOf, type ParamContext } from "../../_http";
import { getState } from "../../_state";

/** §7.6 detail view: the stored hash, the ledger payload match, and a fresh re-hash of the content. */
export async function GET(request: NextRequest, context: ParamContext<"id">) {
  try {
    roleOf(request);
    const id = await paramOf(context, "id");
    const state = await getState();
    const item = state.repo.evidence.get(id);
    if (!item) throw new ApiError(404, `Evidence not found: ${id}`);

    const block = state.ledger.blocks[item.ledgerBlockIndex];
    const payloadHash =
      block && block.eventType === "EVIDENCE_RECORDED"
        ? (block.payload["contentHash"] as string | undefined) ?? null
        : null;
    const rederivedHash =
      item.content === undefined ? null : sha256hex(canonical(item.content));

    return ok({
      evidence: item,
      verification: {
        payloadMatches: payloadHash === item.contentHash,
        rederivedHash,
        rederivedMatches: rederivedHash === null ? null : rederivedHash === item.contentHash,
        ledgerBlockIndex: item.ledgerBlockIndex,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
