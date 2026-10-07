import { NextRequest } from "next/server";
import { draftAlert } from "@/core/ai/draft";
import { ApiError, errorResponse, ok, paramOf, roleOf, type ParamContext } from "../../../_http";
import { getState } from "../../../_state";

/**
 * §7.4 B per alert: generates the dossier once, stores it, appends the
 * DRAFT_GENERATED ledger block (the pipeline's promise, §7.2 step 7) and
 * links it on the alert. Generating is advisory — every role may read it.
 */
export async function POST(request: NextRequest, context: ParamContext<"id">) {
  try {
    roleOf(request);
    const id = await paramOf(context, "id");
    const state = await getState();
    const alert = state.repo.alerts.get(id);
    if (!alert) throw new ApiError(404, `Alert not found: ${id}`);

    const existing = state.repo.drafts.byAlert(id)[0];
    if (existing) return ok({ draft: existing, generated: false });

    const draft = await draftAlert(alert, { clock: state.clock });
    try {
      state.repo.drafts.add(draft);
    } catch (error) {
      // A concurrent prepare (StrictMode double effects) may have stored the
      // draft first; return it instead of duplicating the artefact or block.
      const winner = state.repo.drafts.byAlert(id)[0];
      if (!winner) throw error;
      return ok({ draft: winner, generated: false });
    }
    state.ledger.append({
      eventType: "DRAFT_GENERATED",
      actor: "draft-api@complianceiq.test",
      alertId: alert.id,
      payload: {
        alertId: alert.id,
        draftId: draft.id,
        kind: draft.kind,
        generatedBy: draft.generatedBy,
      },
    });
    state.repo.alerts.update(alert.id, { draftId: draft.id });
    return ok({ draft, generated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
