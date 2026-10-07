"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";

import { useEffect, useRef, useState } from "react";
import { EmptyObligations } from "@/components/illustration/scenes";
import { SavedConfirmation } from "@/components/signature/SavedConfirmation";
import { TIER1_RULES } from "@/core/engine/rules";
import { roleHeaders, useRole } from "@/components/workspace/role-context";
import type { Obligation } from "@/core/types";

type Phase = "loading" | "ready" | "error";
type SavedInfo = { time: string; entry: number; action: "confirm" | "reject" };

interface ExtractResponse {
  documentId: string;
  documentTitle: string;
  proposed: Obligation[];
  text: string;
}

interface EditDraft {
  title: string;
  dueOn: string;
  cadence: string;
  ruleId: string;
}

function emptyDraft(row: Obligation): EditDraft {
  return {
    title: row.title,
    dueOn: row.dueOn ?? "",
    cadence: row.cadence ?? "",
    ruleId: row.ruleIds[0] ?? "",
  };
}

/**
 * Obligations (DESIGN §15.2): upload a policy, review what was found — each
 * quote highlighted in the policy text on the right — and confirm, edit or
 * reject each item. Nothing counts until a person confirms it; confirmed
 * items show the saved confirmation inline.
 */
export default function ObligationsPage() {
  const { role } = useRole();
  const roleRef = useRef(role);
  roleRef.current = role;
  const canAct = role === "officer" || role === "admin";

  const [phase, setPhase] = useState<Phase>("loading");
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Obligation[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, SavedInfo>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [found, setFound] = useState<number | null>(null);
  // Counts uploads that completed while a load() was still in flight, so a
  // slow mount reload can't clobber "Found in your policy: N items".
  const uploadSeq = useRef(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const markRef = useRef<HTMLElement | null>(null);

  function mergeExtract(data: ExtractResponse) {
    setRows((prev) => {
      const byId = new Map(prev.map((row) => [row.id, row]));
      for (const row of data.proposed) byId.set(row.id, row);
      return [...byId.values()];
    });
    setTexts((prev) => ({ ...prev, [data.documentId]: data.text }));
    setTitles((prev) => ({ ...prev, [data.documentId]: data.documentTitle }));
  }

  async function extractDoc(documentId: string): Promise<ExtractResponse> {
    const response = await fetch("/api/obligations/extract", {
      method: "POST",
      headers: roleHeaders(roleRef.current),
      body: JSON.stringify({ documentId }),
    });
    const data = (await response.json().catch(() => ({}))) as Partial<ExtractResponse> & {
      error?: string;
    };
    if (!response.ok || !data.text || !data.proposed) {
      throw new Error(data.error ?? "That document could not be read.");
    }
    return data as ExtractResponse;
  }

  async function load() {
    const stamp = uploadSeq.current;
    setPhase("loading");
    setLoadError("");
    try {
      const response = await fetch("/api/obligations");
      if (!response.ok) throw new Error("Could not load obligations.");
      const data = (await response.json()) as { obligations: Obligation[] };
      const proposed = data.obligations.filter((obligation) => obligation.status === "proposed");
      setTotal(data.obligations.filter((obligation) => obligation.status !== "rejected").length);
      if (stamp === uploadSeq.current) {
        setRows(proposed);
        setFound(null);
        setSelected(proposed[0]?.id ?? null);
      }
      setPhase("ready");
      if (proposed.length > 0) {
        const documents = [...new Set(proposed.map((row) => row.source.documentId))];
        const loaded = await Promise.all(
          documents.map((documentId) =>
            extractDoc(documentId).catch(() => null),
          ),
        );
        for (const data of loaded) if (data) mergeExtract(data);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load obligations.");
      setPhase("error");
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    loadRef.current();
  }, []);

  const selectedRow = rows.find((row) => row.id === selected) ?? rows[0] ?? null;
  const docId = selectedRow?.source.documentId ?? "";
  const docText = texts[docId];
  const quote = selectedRow?.source.quote ?? "";

  // Keep the highlighted quote in view when the selection changes (and when
  // the document text arrives — the mark only exists after that).
  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const reduce = document.documentElement.dataset.reduceMotion === "true";
    mark.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [selected, docId, docText]);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const base = file.name.replace(/\.(md|markdown|txt)$/i, "");
    const documentId = base.startsWith("doc_") ? base : `doc_${base}`;
    setBusy("upload");
    setError("");
    try {
      const data = await extractDoc(documentId);
      uploadSeq.current += 1;
      mergeExtract(data);
      setRows(data.proposed);
      setFound(data.proposed.length);
      setSelected(data.proposed[0]?.id ?? null);
      setEditing(null);
      setSaved({});
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("Unknown document")
          ? `“${file.name}” is not one of the demo policies. Files on file look like doc_access_control.md.`
          : err instanceof Error
            ? err.message
            : "That file could not be read.",
      );
    } finally {
      setBusy(null);
      event.target.value = "";
    }
  }

  async function act(
    id: string,
    action: "confirm" | "reject" | "edit",
    patch?: Record<string, unknown>,
  ) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/obligations/${id}/confirm`, {
        method: "POST",
        headers: roleHeaders(roleRef.current),
        body: JSON.stringify({ action, ...(patch ? { patch } : {}) }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        saved?: SavedInfo;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "This obligation could not be saved.");
      if (action !== "edit" && data.saved) {
        const info = data.saved;
        setSaved((prev) => ({
          ...prev,
          [id]: { time: info.time, entry: info.entry, action: action === "reject" ? "reject" : "confirm" },
        }));
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                ...(patch ?? {}),
                status:
                  action === "confirm" ? "confirmed" : action === "reject" ? "rejected" : row.status,
              }
            : row,
        ),
      );
      setEditing(null);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This obligation could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(row: Obligation) {
    setEditing(row.id);
    setDraft(emptyDraft(row));
  }

  function saveEdit(row: Obligation) {
    if (!draft) return;
    const patch: Record<string, unknown> = { title: draft.title.trim() || row.title };
    if (draft.dueOn) patch["dueOn"] = draft.dueOn;
    if (draft.cadence) patch["cadence"] = draft.cadence;
    patch["ruleIds"] = draft.ruleId ? [draft.ruleId] : [];
    void act(row.id, "edit", patch);
  }

  const headline =
    phase === "loading"
      ? "Loading obligations…"
      : phase === "error"
        ? "Obligations could not be loaded."
        : `${total} obligations on file.`;

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Obligations</h1>
          <p className="page-serif-headline">{headline}</p>
          <p className="page-note">
            Obligations are the promises in your policies. Nothing counts until a person confirms
            it.
          </p>
          {!canAct && phase === "ready" && (
            <p className="page-note">You are reading as an auditor. Officers confirm obligations.</p>
          )}
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="obligations" />

      <div className="obl-toolbar">
        {canAct && (
          <label className="btn btn-primary" aria-busy={busy === "upload"}>
            {busy === "upload" ? "Reading the policy…" : "Upload a policy"}
            <input
              type="file"
              accept=".md,.markdown,.txt"
              aria-label="Upload a policy file"
              onChange={onFile}
              disabled={busy !== null}
            />
          </label>
        )}
        <span className="toolbar-spacer" />
        <span className="page-note">
          Offline demo: the upload reads the sample policies shipped with this build.
        </span>
      </div>

      {error && <p className="error-inline">{error}</p>}

      {phase === "loading" && (
        <div className="obl-layout" aria-busy="true">
          <div className="alerts-table">
            {[0, 1, 2].map((index) => (
              <div className="obl-item" key={index}>
                <span className="skeleton-block" style={{ width: "60%" }} />
              </div>
            ))}
          </div>
          <div className="obl-doc" />
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>{loadError || "The obligation list is unavailable right now."}</p>
          <button type="button" className="btn btn-plain" onClick={loadRef.current}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          {found !== null && (
            <h2 className="ov-title">Found in your policy: {found} items</h2>
          )}

          <div className="obl-layout">
            <div>
              {rows.length === 0 ? (
                <div className="alerts-table obl-list-empty">
                  <div className="state-block obl-empty">
                    <EmptyObligations size={160} />
                    <p>No review in progress.</p>
                    <p>Upload a policy to see the obligations it contains.</p>
                  </div>
                </div>
              ) : (
                <div className="alerts-table obl-list" role="list" aria-label="Proposed obligations">
                  {rows.map((row) => {
                    const rowSaved = saved[row.id];
                    const isSelected = selectedRow?.id === row.id;
                    const decided = row.status !== "proposed";
                    return (
                      <div
                        key={row.id}
                        role="listitem"
                        className={`obl-item${isSelected ? " is-selected" : ""}`}
                        onClick={() => setSelected(row.id)}
                      >
                        <div className="obl-item-head">
                          <span className="row-primary">{row.title}</span>
                          <span className="obl-kind">
                            {row.status === "proposed"
                              ? "Proposed"
                              : row.status === "confirmed"
                                ? "Confirmed"
                                : "Not an obligation"}
                          </span>
                        </div>
                        <span className="cov-quote obl-item-quote" title={row.source.quote}>
                          {row.source.quote}
                        </span>

                        {rowSaved && (
                          <SavedConfirmation time={rowSaved.time} entry={rowSaved.entry} />
                        )}

                        {!decided && canAct && editing !== row.id && (
                          <div className="obl-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy === row.id}
                              onClick={() => act(row.id, "confirm")}
                            >
                              {busy === row.id ? "Saving…" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-plain"
                              disabled={busy === row.id}
                              onClick={() => startEdit(row)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-plain"
                              disabled={busy === row.id}
                              onClick={() => act(row.id, "reject")}
                            >
                              Not an obligation
                            </button>
                          </div>
                        )}

                        {editing === row.id && draft && canAct && (
                          <div className="obl-edit" onClick={(event) => event.stopPropagation()}>
                            <label>
                              Title
                              <input
                                type="text"
                                value={draft.title}
                                onChange={(event) =>
                                  setDraft({ ...draft, title: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              Due on
                              <input
                                type="date"
                                value={draft.dueOn}
                                onChange={(event) => setDraft({ ...draft, dueOn: event.target.value })}
                              />
                            </label>
                            <label>
                              Cadence
                              <select
                                value={draft.cadence}
                                onChange={(event) =>
                                  setDraft({ ...draft, cadence: event.target.value })
                                }
                              >
                                <option value="">No repeat</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annual">Annual</option>
                                <option value="once">Once</option>
                              </select>
                            </label>
                            <label>
                              Checked by
                              <select
                                value={draft.ruleId}
                                onChange={(event) => setDraft({ ...draft, ruleId: event.target.value })}
                              >
                                <option value="">No automated check</option>
                                {TIER1_RULES.map((rule) => (
                                  <option key={rule.meta.id} value={rule.meta.id}>
                                    {rule.meta.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="obl-actions">
                              <button
                                type="button"
                                className="btn btn-plain"
                                disabled={busy === row.id}
                                onClick={() => saveEdit(row)}
                              >
                                {busy === row.id ? "Saving…" : "Save changes"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-quiet"
                                onClick={() => {
                                  setEditing(null);
                                  setDraft(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="obl-doc">
              <div className="obl-doc-head">
                <span className="obl-doc-title">
                  {docId ? (titles[docId] ?? docId) : "Source policy"}
                </span>
                <span className="toolbar-spacer" />
                <span className="page-note">The quote is highlighted in the text.</span>
              </div>
              {selectedRow && docText ? (
                <div className="obl-doc-text">
                  {docText.includes(quote) ? (
                    <>
                      {docText.slice(0, docText.indexOf(quote))}
                      <mark ref={markRef}>{quote}</mark>
                      {docText.slice(docText.indexOf(quote) + quote.length)}
                    </>
                  ) : (
                    docText
                  )}
                </div>
              ) : (
                <p className="page-note obl-doc-note">
                  {rows.length === 0
                    ? "Upload a policy to see its text here with the found quotes highlighted."
                    : "The policy text could not be reloaded. The quotes are still listed on the left."}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
