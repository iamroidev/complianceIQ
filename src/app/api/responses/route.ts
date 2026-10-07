import { NextRequest } from "next/server";
import { responseRows } from "@/lib/responses";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/** §7.9: the response catalog with the saved mode, readable by every role. */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const responses = responseRows().map((row) => ({
      ...row,
      mode: state.responseSettings[row.id] ?? "suggest",
    }));
    return ok({ responses, live: process.env.RESPONSES_LIVE === "true" });
  } catch (error) {
    return errorResponse(error);
  }
}
