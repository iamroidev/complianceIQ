"use client";

/**
 * Tamper check (DESIGN.md §6.6): a button, a steady progress run, then a
 * plain result sentence — "All 1,284 entries verified" or "Entry 812 was
 * altered. 472 later entries can no longer be trusted." The "Restore" action
 * appears only for the demo panel's simulated tampering, which works on a
 * copy (§7.6) and is reversed by discarding it.
 */

export type TamperCheckState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "ok"; checked: number }
  | { phase: "failed"; brokenIndex: number; later: number };

export function TamperCheck({
  state,
  onRun,
  onRestore,
  simulated = false,
}: {
  state: TamperCheckState;
  onRun: () => void;
  onRestore?: () => void;
  /** True while the shown result describes the demo panel's in-memory copy. */
  simulated?: boolean;
}) {
  const checking = state.phase === "checking";
  const failed = state.phase === "failed";
  const text =
    state.phase === "checking"
      ? "Checking the record…"
      : state.phase === "ok"
        ? `All ${state.checked.toLocaleString("en-US")} entries verified.`
        : failed
          ? `Entry ${state.brokenIndex} was altered.` +
            (state.later > 0 ? ` ${state.later} later entries can no longer be trusted.` : "")
          : "";

  return (
    <div className="tamper-row">
      <button type="button" className="btn btn-plain" onClick={onRun} disabled={checking}>
        {checking ? "Checking…" : "Run tamper check"}
      </button>
      {text && (
        <span className={`tamper-result${failed ? " is-altered" : ""}`} role="status">
          {text}
        </span>
      )}
      {failed && simulated && onRestore && (
        <button type="button" className="btn-quiet" onClick={onRestore}>
          Restore
        </button>
      )}
    </div>
  );
}
