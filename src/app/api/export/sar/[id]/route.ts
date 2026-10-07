import { NextRequest } from "next/server";
import { buildSarExport } from "@/core/reports/sar";
import { ApiError, errorResponse, ok, paramOf, requireRole, type ParamContext } from "../../../_http";
import { getState } from "../../../_state";

/**
 * §7.4 SAR-style draft export (officer/admin): renders the stored draft to
 * XML + JSON + PDF. A rendering only — no AI call, no state change, no
 * ledger block. Generate the draft first via POST /api/alerts/:id/draft.
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    const role = requireRole(request, "officer", "admin");
    const id = await paramOf(context, "id");
    const state = await getState();
    const alert = state.repo.alerts.get(id);
    if (!alert) throw new ApiError(404, `Alert not found: ${id}`);
    const draft = state.repo.drafts.byAlert(id)[0];
    if (!draft) {
      throw new ApiError(404, `No draft for alert ${id} — generate it first (POST /api/alerts/${id}/draft).`);
    }

    const exportResult = await buildSarExport({
      alert,
      draft,
      generatedBy: role,
      generatedAt: state.clock.now(),
    });
    return ok({ alertId: id, ...exportResult });
  } catch (error) {
    return errorResponse(error);
  }
}
