import type { Ledger } from "../ledger";
import type { ResponseId, ResponseMode, ResponseSuggestion } from "./response-rules";

export interface ResponseExecutionRecord {
  responseId: ResponseId;
  alertId: string;
  ruleId: string;
  mode: ResponseMode;
  dryRun: boolean;
  wouldBeRequest: ResponseSuggestion["wouldBeRequest"];
}

export interface ResponseExecutorDeps {
  ledger: Ledger;
  /** Defaults to process.env.RESPONSES_LIVE === "true" (§7.9: dry-run unless live). */
  live?: boolean;
  actor?: string;
}

function keyOf(responseId: string, alertId: string): string {
  return `${responseId}::${alertId}`;
}

/**
 * Executes automatic responses (§7.9). Every execution and reversal is a
 * ledger block; without RESPONSES_LIVE=true the record is a dry run whose
 * would-be request the UI shows under "Show technical details".
 */
export function createResponseExecutor(deps: ResponseExecutorDeps) {
  const live = deps.live ?? process.env.RESPONSES_LIVE === "true";
  const actor = deps.actor ?? "responses@complianceiq.test";

  function executions(): ResponseExecutionRecord[] {
    const out: ResponseExecutionRecord[] = [];
    for (const block of deps.ledger.blocks) {
      if (block.eventType === "RESPONSE_EXECUTED") {
        out.push(block.payload as unknown as ResponseExecutionRecord);
      }
    }
    return out;
  }

  function activeKeys(): Set<string> {
    const keys = new Set<string>();
    for (const record of executions()) keys.add(keyOf(record.responseId, record.alertId));
    for (const block of deps.ledger.blocks) {
      if (block.eventType !== "RESPONSE_REVERSED") continue;
      const payload = block.payload as { responseId?: string; alertId?: string };
      if (payload.responseId && payload.alertId) {
        keys.delete(keyOf(payload.responseId, payload.alertId));
      }
    }
    return keys;
  }

  return {
    /** Records an automatic execution as a ledger block (dry-run unless live). */
    execute(suggestion: ResponseSuggestion): { blockIndex: number; dryRun: boolean } {
      const dryRun = !live;
      const record: ResponseExecutionRecord = {
        responseId: suggestion.responseId,
        alertId: suggestion.alertId,
        ruleId: suggestion.ruleId,
        mode: suggestion.mode,
        dryRun,
        wouldBeRequest: suggestion.wouldBeRequest,
      };
      const block = deps.ledger.append({
        eventType: "RESPONSE_EXECUTED",
        actor,
        alertId: suggestion.alertId,
        payload: record as unknown as Record<string, unknown>,
      });
      return { blockIndex: block.blockIndex, dryRun };
    },

    /** Executions still standing (executed minus reversed). */
    active(): ResponseExecutionRecord[] {
      const keys = activeKeys();
      return executions().filter((record) => keys.has(keyOf(record.responseId, record.alertId)));
    },

    /**
     * Reverses automatic executions for an alert whose triggering condition
     * cleared (§7.9, state rules). Appends one RESPONSE_REVERSED per execution.
     */
    reverseForAlert(alertId: string): number {
      let reversed = 0;
      for (const record of this.active()) {
        if (record.alertId !== alertId) continue;
        deps.ledger.append({
          eventType: "RESPONSE_REVERSED",
          actor,
          alertId,
          payload: {
            responseId: record.responseId,
            alertId: record.alertId,
            ruleId: record.ruleId,
            dryRun: record.dryRun,
          },
        });
        reversed += 1;
      }
      return reversed;
    },
  };
}

export type ResponseExecutor = ReturnType<typeof createResponseExecutor>;
