"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, Clock, AlertTriangle, ShieldCheck, FileText, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";
import type { Obligation } from "@/core/types";
import { formatDay, formatMonth } from "@/lib/format";
import { WallCalendar, type CalendarMark } from "@/components/illustration/scenes/WallCalendar";
import { Due, computeDueInfo } from "@/components/signature/Due";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { SavedConfirmation } from "@/components/signature/SavedConfirmation";
import { useRole, roleHeaders } from "@/components/workspace/role-context";

type Phase = "loading" | "ready" | "error";

function stateOf(obligation: Obligation, asOf: string): CalendarMark {
  const dueOn = obligation.dueOn!;
  const days = Math.round(
    (Date.parse(`${dueOn}T23:59:59Z`) - Date.parse(asOf.slice(0, 10))) / 86_400_000,
  );
  if (obligation.lastCompletedOn) return { obligation, dueOn, days, state: "done" };
  if (days < 0) return { obligation, dueOn, days, state: "overdue" };
  if (days <= 30) return { obligation, dueOn, days, state: "soon" };
  return { obligation, dueOn, days, state: "later" };
}

function headlineForCounts(soon: number, overdue: number): string {
  const soonPart =
    soon === 0
      ? "No deadlines in the next 30 days."
      : `${soon === 1 ? "1 deadline" : `${soon} deadlines`} in the next 30 days.`;
  const overduePart =
    overdue === 0 ? "None are overdue." : `${overdue === 1 ? "1 is" : `${overdue} are`} overdue.`;
  return `${soonPart} ${overduePart}`;
}

export default function DeadlinesPage() {
  const { role } = useRole();
  const [phase, setPhase] = useState<Phase>("loading");
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [asOf, setAsOf] = useState("");
  const [error, setError] = useState("");

  // Selection & Detail drawer
  const [selectedMark, setSelectedMark] = useState<CalendarMark | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Add Deadline Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("2026-04-15");
  const [newOwner, setNewOwner] = useState("Ama Mensah");
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [addError, setAddError] = useState("");

  // Mark Completed feedback
  const [completedMap, setCompletedMap] = useState<Record<string, { time: string; entry: number }>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

  const load = useRef(async () => {
    setPhase("loading");
    setError("");
    try {
      const [obligationsRes, alertsRes] = await Promise.all([
        fetch("/api/obligations"),
        fetch("/api/alerts"),
      ]);
      if (!obligationsRes.ok || !alertsRes.ok) throw new Error("Deadlines could not be loaded.");
      const obligationsData = (await obligationsRes.json()) as { obligations: Obligation[] };
      const alertsData = (await alertsRes.json()) as { asOf: string };
      setObligations(obligationsData.obligations);
      setAsOf(alertsData.asOf);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deadlines could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const marks = useMemo(() => {
    if (!asOf) return [] as CalendarMark[];
    return obligations
      .filter((obligation) => obligation.status === "confirmed" && obligation.dueOn)
      .map((obligation) => stateOf(obligation, asOf))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  }, [obligations, asOf]);

  const soon = marks.filter((mark) => mark.state === "soon").length;
  const overdue = marks.filter((mark) => mark.state === "overdue").length;

  const headline =
    phase === "loading"
      ? "Loading deadlines…"
      : phase === "error"
        ? "Deadlines could not be loaded."
        : headlineForCounts(soon, overdue);

  // Groups for Agenda per §29.9 / §30.4
  const overdueMarks = useMemo(() => marks.filter((m) => m.state === "overdue"), [marks]);
  const next14DaysMarks = useMemo(
    () => marks.filter((m) => m.state === "soon" && m.days <= 14 && m.days >= 0),
    [marks],
  );
  const laterMarks = useMemo(
    () => marks.filter((m) => m.state === "later" || (m.state === "soon" && m.days > 14)),
    [marks],
  );

  // Next nearest deadline for §30.2 Next Deadline Card
  const nextDeadline = useMemo(() => {
    const pending = marks.filter((m) => m.state !== "done");
    if (pending.length === 0) return null;
    return pending[0];
  }, [marks]);

  // Handle Mark as Completed — real write: POST /api/obligations/[id]/complete
  const handleMarkCompleted = async (mark: CalendarMark) => {
    setIsCompleting(true);
    setCompleteError("");
    const completedOn = (asOf || new Date().toISOString()).slice(0, 10);
    try {
      const res = await fetch(`/api/obligations/${mark.obligation.id}/complete`, {
        method: "POST",
        headers: roleHeaders(role),
        body: JSON.stringify({ completedOn }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        saved?: { time: string; entry: number };
        error?: string;
      };
      if (!res.ok || !data.saved) {
        throw new Error(data.error ?? "The completion could not be recorded.");
      }
      setCompletedMap((prev) => ({
        ...prev,
        [mark.obligation.id]: data.saved as { time: string; entry: number },
      }));
      // Mirror the server write so the calendar/agenda recompute the mark.
      setObligations((prev) =>
        prev.map((obligation) =>
          obligation.id === mark.obligation.id ? { ...obligation, lastCompletedOn: completedOn } : obligation,
        ),
      );
      setSelectedMark((prev) =>
        prev && prev.obligation.id === mark.obligation.id ? { ...prev, state: "done" } : prev,
      );
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "The completion could not be recorded.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle Add Deadline — real write: PATCH /api/registers/obligations
  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSavingNew) return;

    const newObl: Obligation = {
      id: `custom_dl_${Date.now()}`,
      title: newTitle.trim(),
      plainDescription: newTitle.trim(),
      kind: "deadline",
      origin: "manual",
      dueOn: newDueDate,
      status: "confirmed",
      ruleIds: ["DEAD-001"],
      source: {
        documentId: "doc_calendar",
        quote: newTitle.trim(),
        quoteSpan: [0, newTitle.trim().length],
      },
      ownerId: newOwner.trim() || undefined,
    };

    setIsSavingNew(true);
    setAddError("");
    try {
      const res = await fetch("/api/registers/obligations", {
        method: "PATCH",
        headers: roleHeaders(role),
        body: JSON.stringify({ upsert: [newObl] }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "The deadline could not be saved.");
      setObligations((prev) => [newObl, ...prev.filter((o) => o.id !== newObl.id)]);
      setIsAddModalOpen(false);
      setNewTitle("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "The deadline could not be saved.");
    } finally {
      setIsSavingNew(false);
    }
  };

  return (
    <div className="page-case-room">
      {/* Page Header Frame (§29.0, §29.9, §30.2) */}
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Deadlines</h1>
          <p className="page-serif-headline">{headline}</p>
        </div>

        <button
          type="button"
          className="btn btn-navy"
          onClick={() => setIsAddModalOpen(true)}
          title="Add a custom regulatory deadline"
        >
          <Plus size={16} />
          <span>Add a deadline</span>
        </button>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="deadlines" />

      {/* §30.2 Next Deadline Hero Card (Paper surface, 140px tall, serif 40px countdown) */}
      {nextDeadline && (
        <section className="next-deadline-hero-card" aria-label="Nearest upcoming deadline">
          <div className="next-dl-header-col">
            <span className="next-dl-eyebrow">
              {nextDeadline.state === "overdue" ? "Immediate Attention" : "Next Upcoming Deadline"}
            </span>
            <div className="next-dl-countdown-row">
              <span className={`next-dl-time ${nextDeadline.state}`}>
                {nextDeadline.state === "overdue"
                  ? `Overdue by ${Math.abs(nextDeadline.days)} days`
                  : nextDeadline.days === 0
                    ? "Due today"
                    : `In ${nextDeadline.days} days`}
              </span>
              <Due target={nextDeadline.dueOn} asOf={asOf} showAbsolute />
            </div>
            <h2 className="next-dl-title">{nextDeadline.obligation.title}</h2>
          </div>

          <div className="next-dl-action-col">
            <span className="next-dl-owner">Owner: Compliance Operations</span>
            <button
              type="button"
              className="btn btn-navy"
              onClick={() => setSelectedMark(nextDeadline)}
            >
              <span>View & complete</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </section>
      )}

      {phase === "loading" && (
        <div className="overview-desk-panel" style={{ minHeight: 400 }} aria-busy="true">
          <p className="page-serif-headline" style={{ textAlign: "center", paddingTop: 80 }}>
            Loading calendar pages…
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="error-block" style={{ padding: "48px 24px", textAlign: "center" }}>
          <p className="t-sentence" style={{ marginBottom: 16 }}>
            {error || "We couldn't load deadlines. Try again."}
          </p>
          <button type="button" className="btn btn-navy" onClick={() => void load.current()}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          {marks.length === 0 ? (
            /* Empty state (§29.22, §30.5) */
            <div className="overview-desk-panel" style={{ textAlign: "center", padding: "64px 32px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <CalendarIcon size={80} color="var(--accent)" strokeWidth={1.5} />
              </div>
              <h2 className="page-serif-title" style={{ fontSize: 28, marginBottom: 8 }}>
                No deadlines on file
              </h2>
              <p className="page-serif-headline" style={{ fontSize: 17, color: "var(--text-2)", marginBottom: 24 }}>
                No confirmed obligations have scheduled dates yet. Add a deadline or upload a regulatory policy.
              </p>
              <button
                type="button"
                className="btn btn-navy"
                onClick={() => setIsAddModalOpen(true)}
              >
                Add your first deadline
              </button>
            </div>
          ) : (
            /* The Wall Calendar + Agenda Two-Column Grid (§29.9) */
            <div className="deadlines-room-grid">
              {/* Left Column: The Wall Calendar Hero Object (≈ 720px) */}
              <div className="calendar-column">
                <WallCalendar
                  marks={marks}
                  asOf={asOf}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d)}
                  onSelectMark={(m) => setSelectedMark(m)}
                />
              </div>

              {/* Right Column: Agenda Grouped Rows (≈ 440px) */}
              <div className="agenda-column" role="region" aria-label="Deadlines Agenda">
                <div className="agenda-header-row">
                  <h2 className="agenda-heading">Agenda & Obligations</h2>
                  <span className="agenda-count">{marks.length} total</span>
                </div>

                {/* Overdue Section */}
                {overdueMarks.length > 0 && (
                  <div className="agenda-section section-overdue">
                    <div className="agenda-section-title-row">
                      <AlertTriangle size={16} className="section-icon overdue" />
                      <h3 className="section-title overdue">
                        Overdue ({overdueMarks.length})
                      </h3>
                    </div>
                    <div className="agenda-cards-list">
                      {overdueMarks.map((m) => (
                        <div
                          key={m.obligation.id}
                          className={`agenda-card is-overdue${
                            selectedMark?.obligation.id === m.obligation.id ? " is-selected" : ""
                          }`}
                          onClick={() => setSelectedMark(m)}
                        >
                          <div className="agenda-card-head">
                            <span className="agenda-badge overdue">OVERDUE</span>
                            <span className="agenda-countdown">Overdue by {Math.abs(m.days)} days</span>
                          </div>
                          <h4 className="agenda-card-title">{m.obligation.title}</h4>
                          <div className="agenda-card-meta">
                            <span className="agenda-date">{formatDay(m.dueOn)}</span>
                            <span className="agenda-action-hint">View details →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next 14 Days Section */}
                {next14DaysMarks.length > 0 && (
                  <div className="agenda-section section-soon">
                    <div className="agenda-section-title-row">
                      <Clock size={16} className="section-icon soon" />
                      <h3 className="section-title soon">
                        Next 14 days ({next14DaysMarks.length})
                      </h3>
                    </div>
                    <div className="agenda-cards-list">
                      {next14DaysMarks.map((m) => (
                        <div
                          key={m.obligation.id}
                          className={`agenda-card is-soon${
                            selectedMark?.obligation.id === m.obligation.id ? " is-selected" : ""
                          }`}
                          onClick={() => setSelectedMark(m)}
                        >
                          <div className="agenda-card-head">
                            <span className="agenda-badge soon">DUE SOON</span>
                            <span className="agenda-countdown">In {m.days} days</span>
                          </div>
                          <h4 className="agenda-card-title">{m.obligation.title}</h4>
                          <div className="agenda-card-meta">
                            <span className="agenda-date">{formatDay(m.dueOn)}</span>
                            <span className="agenda-action-hint">View details →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Later Section */}
                {laterMarks.length > 0 && (
                  <div className="agenda-section section-later">
                    <div className="agenda-section-title-row">
                      <ShieldCheck size={16} className="section-icon later" />
                      <h3 className="section-title later">
                        Scheduled Later ({laterMarks.length})
                      </h3>
                    </div>
                    <div className="agenda-cards-list">
                      {laterMarks.map((m) => (
                        <div
                          key={m.obligation.id}
                          className={`agenda-card is-later${
                            selectedMark?.obligation.id === m.obligation.id ? " is-selected" : ""
                          }`}
                          onClick={() => setSelectedMark(m)}
                        >
                          <div className="agenda-card-head">
                            <span className="agenda-badge later">
                              {m.state === "done" ? "COMPLETED" : "SCHEDULED"}
                            </span>
                            <span className="agenda-countdown">
                              {m.state === "done" ? "Done" : `In ${m.days} days`}
                            </span>
                          </div>
                          <h4 className="agenda-card-title">{m.obligation.title}</h4>
                          <div className="agenda-card-meta">
                            <span className="agenda-date">{formatDay(m.dueOn)}</span>
                            <span className="agenda-action-hint">View details →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Side Detail & Completion Drawer (§29.9) */}
      {selectedMark && (
        <div className="deadline-drawer-backdrop" onClick={() => setSelectedMark(null)}>
          <div
            className="deadline-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-obligation-title"
          >
            <div className="drawer-header-row">
              <span className="drawer-eyebrow">Obligation Details</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedMark(null)}
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            <h3 id="drawer-obligation-title" className="drawer-title">
              {selectedMark.obligation.title}
            </h3>

            {/* Urgency Badge */}
            <div className="drawer-urgency-row">
              <Due target={selectedMark.dueOn} asOf={asOf} showAbsolute />
              <span className="drawer-due-date">Due: {formatDay(selectedMark.dueOn)}</span>
            </div>

            {/* Source Policy Quote Highlight */}
            <div className="drawer-quote-block">
              <span className="drawer-quote-label">
                Policy Document: {selectedMark.obligation.source.documentId.replace("doc_", "").replace(/_/g, " ")}
              </span>
              <blockquote className="drawer-quote-text">
                “{selectedMark.obligation.source.quote}”
              </blockquote>
            </div>

            {/* Owner & Assigned Rule */}
            <div className="drawer-meta-table">
              <div className="meta-row">
                <span className="meta-key">Responsible:</span>
                <span className="meta-val">Compliance Operations Team</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Watcher Rule:</span>
                <span className="meta-val">DEAD-001 (Deadline Sentinel)</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Status:</span>
                <span className="meta-val capitalize">{selectedMark.state}</span>
              </div>
            </div>

            {/* Saved Confirmation if completed */}
            {completedMap[selectedMark.obligation.id] && (
              <div className="drawer-completed-notice">
                <SavedConfirmation
                  entry={completedMap[selectedMark.obligation.id].entry}
                  time={completedMap[selectedMark.obligation.id].time}
                />
              </div>
            )}

            {/* Completion Actions */}
            <div className="drawer-actions-block">
              {selectedMark.state !== "done" && !completedMap[selectedMark.obligation.id] ? (
                <>
                  <button
                    type="button"
                    className="btn btn-navy drawer-complete-btn"
                    onClick={() => handleMarkCompleted(selectedMark)}
                    disabled={isCompleting}
                  >
                    <Check size={16} />
                    <span>{isCompleting ? "Recording proof…" : "Mark as completed (with proof)"}</span>
                  </button>
                  {completeError && (
                    <p className="drawer-error-msg" role="alert">
                      {completeError}
                    </p>
                  )}
                </>
              ) : (
                <div className="drawer-completed-chip">
                  <ShieldCheck size={16} />
                  <span>Verified & completed on the ledger</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Deadline Dialog */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-paper-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add a regulatory deadline</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddDeadline}>
              <p className="modal-desc">
                Saves a confirmed deadline obligation. Monitored automatically against the demo clock.
              </p>

              <div className="modal-field">
                <label htmlFor="new-title" className="modal-label">Obligation Title</label>
                <input
                  id="new-title"
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Annual AML Audit Filing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-due" className="modal-label">Due Date</label>
                <input
                  id="new-due"
                  type="date"
                  className="modal-input"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-owner" className="modal-label">Responsible Person</label>
                <input
                  id="new-owner"
                  type="text"
                  className="modal-input"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions-row">
                {addError && (
                  <p className="drawer-error-msg modal-error" role="alert">
                    {addError}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-navy" disabled={isSavingNew}>
                  {isSavingNew ? "Saving…" : "Save deadline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
