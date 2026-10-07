"use client";

import { useEffect, useState } from "react";
import { SavedConfirmation } from "@/components/signature/SavedConfirmation";
import { useRole } from "./role-context";
import { DISMISS_REASONS, STATUS_CLOSED } from "./case-text";
import type { Alert } from "@/core/types";

export type DecisionChoice = "file" | "dismiss" | "escalate";

/**
 * Sticky decision bar (DESIGN §7.5): File report, Dismiss alert (reason from
 * a plain list), Escalate to manager. Each one confirms in a single sentence
 * what will be saved, then shows the saved confirmation inline.
 */
export function DecisionBar({
  status,
  saveResult,
  error,
  busy,
  submit,
}: {
  status: Alert["status"];
  saveResult: { time: string; entry: number } | null;
  error: string;
  busy: boolean;
  submit: (decision: DecisionChoice, reason?: string) => void;
}) {
  const [pending, setPending] = useState<DecisionChoice | null>(null);
  const [reason, setReason] = useState("");
  const { role } = useRole();

  const closedLabel = STATUS_CLOSED[status];
  const open = status === "open" || status === "in_review";
  /** MASTER §8: an auditor reads and verifies; only officers and admins decide. */
  const mayDecide = role === "officer" || role === "admin";

  // A recorded decision closes the choice: drop any half-open confirmation so
  // the bar never offers to file (or dismiss/escalate) an already closed case.
  useEffect(() => {
    if (saveResult) {
      setPending(null);
      setReason("");
    }
  }, [saveResult]);

  function cancel() {
    setPending(null);
    setReason("");
  }

  return (
    <>
      {saveResult && <SavedConfirmation time={saveResult.time} entry={saveResult.entry} />}

      {closedLabel && (
        <p className="wb-closed">
          This case is closed: {closedLabel}.{" "}
          {saveResult ? "Saved to the audit record." : "No further decisions can be recorded."}
        </p>
      )}

      {open && pending === "file" && (
        <div className="confirm" role="group" aria-label="Confirm filing">
          <p>
            File a report for this case? This saves “Report filed” to the audit record with a time
            and an entry number.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => submit("file")}
          >
            {busy ? "Saving…" : "Confirm and file report"}
          </button>
          <button type="button" className="btn btn-plain" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      {open && pending === "dismiss" && (
        <div className="confirm" role="group" aria-label="Confirm dismissal">
          <p>
            This saves “Dismissed” and your reason to the audit record. Choose why this alert goes
            away.
          </p>
          <select
            aria-label="Reason for dismissal"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
          >
            <option value="">Choose a reason</option>
            {DISMISS_REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy || reason === ""}
            onClick={() => submit("dismiss", reason)}
          >
            {busy ? "Saving…" : "Confirm dismissal"}
          </button>
          <button type="button" className="btn btn-plain" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      {open && pending === "escalate" && (
        <div className="confirm" role="group" aria-label="Confirm escalation">
          <p>
            This saves “Escalated” to the audit record and hands the case to a manager. The risk
            score does not change.
          </p>
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy}
            onClick={() => submit("escalate")}
          >
            {busy ? "Saving…" : "Confirm escalation"}
          </button>
          <button type="button" className="btn btn-plain" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      {error && <p className="error-inline">{error}</p>}

      {open && !mayDecide && (
        <div className="wb-bar">
          <span className="bar-note">
            An auditor reads and verifies this case. Filing, dismissing and escalating are left to
            an officer.
          </span>
        </div>
      )}

      {open && mayDecide && (
        <div className="wb-bar">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || pending !== null}
            onClick={() => setPending("file")}
          >
            File report
          </button>
          <button
            type="button"
            className="btn btn-plain"
            disabled={busy || pending !== null}
            onClick={() => setPending("dismiss")}
          >
            Dismiss alert
          </button>
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy || pending !== null}
            onClick={() => setPending("escalate")}
          >
            Escalate to manager
          </button>
          <span className="bar-note">
            Every choice is saved to the audit record with a time and an entry number.
          </span>
        </div>
      )}
    </>
  );
}
