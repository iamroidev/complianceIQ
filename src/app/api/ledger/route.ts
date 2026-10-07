import { NextRequest } from "next/server";
import { headHash } from "@/core/ledger";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/** §7.6: the append-only chain, read-only for every role. */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const blocks = state.ledger.blocks;
    return ok({
      blocks,
      count: blocks.length,
      headBlockIndex: blocks.length === 0 ? null : blocks[blocks.length - 1].blockIndex,
      headHash: headHash(blocks),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
