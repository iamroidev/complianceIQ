import type { Alert } from "../types";
import type { ResponseSettings, ResponseSuggestion } from "./response-rules";
import { defaultResponseSettings, evaluateResponses } from "./response-rules";
import { createResponseExecutor } from "./executor";

export interface AppliedResponses {
  /** Suggestions for responses in suggest mode (§7.9). */
  suggestions: ResponseSuggestion[];
  /** Ledger-backed executions for responses in automatic mode (§7.9). */
  executed: { responseId: string; alertId: string; blockIndex: number; dryRun: boolean }[];
}

/**
 * Evaluates the §7.9 response rules for a batch of alerts: suggest-mode
 * responses come back as suggestions, automatic ones execute through the
 * dry-run executor and become ledger blocks. Used by process-event (§7.2
 * step 8) and run-checks so state-rule alerts get the same treatment.
 */
export function applyResponses(
  alerts: readonly Alert[],
  settings: ResponseSettings | undefined,
  deps: { ledger: Parameters<typeof createResponseExecutor>[0]["ledger"] },
): AppliedResponses {
  const resolvedSettings = settings ?? defaultResponseSettings();
  const executor = createResponseExecutor({ ledger: deps.ledger });
  const suggestions: ResponseSuggestion[] = [];
  const executed: AppliedResponses["executed"] = [];
  for (const alert of alerts) {
    for (const suggestion of evaluateResponses(alert, resolvedSettings)) {
      if (suggestion.mode === "automatic") {
        const { blockIndex, dryRun } = executor.execute(suggestion);
        executed.push({
          responseId: suggestion.responseId,
          alertId: suggestion.alertId,
          blockIndex,
          dryRun,
        });
      } else {
        suggestions.push(suggestion);
      }
    }
  }
  return { suggestions, executed };
}
