"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { SpotAccess } from "@/components/illustration/scenes/Spots";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { roleHeaders, useRole } from "@/components/workspace/role-context";
import type { ResponseMode } from "@/core/responses/response-rules";
import {
  RESPONSE_MODE_LABEL,
  RESPONSE_RECORDED,
  responseHeadline,
  type ResponseRow,
} from "@/lib/responses";

type Phase = "loading" | "ready" | "error";
interface ResponseView extends ResponseRow {
  mode: ResponseMode;
}

const MODES: ResponseMode[] = ["off", "suggest", "automatic"];

export default function ResponsesPage() {
  const { role } = useRole();
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<ResponseView[]>([]);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<ResponseView | null>(null);
  const [confirm, setConfirm] = useState<ResponseView | null>(null);
  const [rowError, setRowError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const isAdmin = role === "admin";

  const load = useCallback(async () => {
    setPhase("loading");
    setLoadError("");
    try {
      const response = await fetch("/api/responses", { headers: roleHeaders(role) });
      if (!response.ok) throw new Error("Responses could not be loaded.");
      const data = (await response.json()) as {
        responses: ResponseView[];
        live: boolean;
      };
      setRows(data.responses);
      setLive(data.live);
      setSelected((current) => current ?? data.responses[0]?.id ?? null);
      setPhase("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Responses could not be loaded.");
      setPhase("error");
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!confirm) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirm(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm]);

  const stats = useMemo(() => {
    const total = rows.length;
    const suggest = rows.filter((r) => r.mode === "suggest").length;
    const automatic = rows.filter((r) => r.mode === "automatic").length;
    const off = rows.filter((r) => r.mode === "off").length;
    return { total, suggest, automatic, off };
  }, [rows]);

  const save = useCallback(
    async (row: ResponseView, mode: ResponseMode) => {
      setRowError("");
      setPending(row);
      try {
        const response = await fetch(`/api/responses/${row.id}`, {
          method: "PATCH",
          headers: roleHeaders(role),
          body: JSON.stringify({ mode }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "The mode could not be changed.");
        }
        setRows((current) =>
          current.map((item) => (item.id === row.id ? { ...item, mode } : item)),
        );
      } catch (err) {
        setRowError(err instanceof Error ? err.message : "The mode could not be changed.");
      } finally {
        setPending(null);
      }
    },
    [role],
  );

  function choose(row: ResponseView, mode: ResponseMode) {
    setSelected(row.id);
    if (mode === "automatic" && row.mode !== "automatic") {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setConfirm(row);
      return;
    }
    void save(row, mode);
  }

  const headline =
    phase === "loading"
      ? "Loading responses…"
      : phase === "error"
        ? "Responses could not be loaded."
        : rows.length > 0
          ? responseHeadline(
              Object.fromEntries(rows.map((row) => [row.id, row.mode])),
            )
          : "No responses are configured.";

  const chosen =
    rows.find((row) => row.id === selected) ?? rows[0] ?? null;

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Automated &amp; Guided Responses</h1>
          <p className="page-serif-headline">{headline}</p>
          <p className="page-note">
            Responses only execute after a deterministic rule detects a violation. &quot;Suggest only&quot; requires human sign-off; &quot;Automatic&quot; executes via policy automation.
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="responses" />

      {/* Visual Top Panel */}
      <section className="overview-desk-panel" style={{ marginBottom: "var(--space-5)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "var(--space-5)",
            alignItems: "center",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <SpotAccess size={110} />
          </div>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Configured Actions
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Active playbooks
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--brand-accent, var(--text-1))", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Suggest Only
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.suggest}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Human in the loop
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Automatic
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--verified)", marginTop: "2px" }}>
                  {stats.automatic}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Zero-touch execution
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Audit Logging
                </div>
                <div style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-1)", marginTop: "6px" }}>
                  100% Chained
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Every call recorded
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {phase === "error" && (
        <div className="error-block">
          <p>{loadError}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          ))}
        </div>
      )}

      {phase === "ready" && rows.length === 0 && (
        <div className="state-block">
          <p>No responses are set up yet.</p>
          <p>Nothing will act on an alert until one is added.</p>
        </div>
      )}

      {phase === "ready" && rows.length > 0 && (
        <>
          <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
            <div className="alerts-row alerts-head rs-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
              <span>Response Rule &amp; Action</span>
              <span>Execution Mode</span>
            </div>
            {rows.map((row) => (
              <div
                className={`alerts-row rs-row${chosen?.id === row.id ? " is-selected" : ""}`}
                key={row.id}
                style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}
              >
                <button
                  type="button"
                  className="rs-pick"
                  aria-pressed={chosen?.id === row.id}
                  onClick={() => setSelected(row.id)}
                  style={{ textAlign: "left", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <span style={{ fontWeight: chosen?.id === row.id ? 600 : 500, color: "var(--text-1)" }}>
                    {row.sentence}
                  </span>
                </button>
                {isAdmin ? (
                  <fieldset className="seg">
                    <legend className="sr-only">{`Mode for ${row.title}`}</legend>
                    {MODES.map((mode) => (
                      <label
                        className={`seg-opt${row.mode === mode ? " is-on" : ""}`}
                        key={mode}
                      >
                        <input
                          type="radio"
                          name={`rs-mode-${row.id}`}
                          value={mode}
                          checked={row.mode === mode}
                          disabled={pending?.id === row.id}
                          onChange={() => choose(row, mode)}
                        />
                        <span>{RESPONSE_MODE_LABEL[mode]}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <span className="rs-mode-static">{RESPONSE_MODE_LABEL[row.mode]}</span>
                )}
              </div>
            ))}
          </div>

          {rowError && (
            <div className="error-block" style={{ marginTop: "var(--space-3)" }}>
              <p>{rowError}</p>
            </div>
          )}

          {!isAdmin && (
            <p className="page-note rs-role-note" style={{ marginTop: "var(--space-3)" }}>
              Only an administrator can change response modes. All current settings are visible above.
            </p>
          )}

          {chosen && (
            <div className="rs-strip" aria-label={`Steps for ${chosen.title}`} style={{ marginTop: "var(--space-4)", background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
              <div className="rs-step">
                <span className="rs-step-label">Trigger Condition</span>
                <span className="rs-step-text">{chosen.trigger}</span>
              </div>
              <span className="so-arrow" aria-hidden="true">
                &rarr;
              </span>
              <div className="rs-step">
                <span className="rs-step-label">Automated Action</span>
                <span className="rs-step-text">{chosen.summary}</span>
              </div>
              <span className="so-arrow" aria-hidden="true">
                &rarr;
              </span>
              <div className="rs-step">
                <span className="rs-step-label">Audit Recording</span>
                <span className="rs-step-text">{RESPONSE_RECORDED}</span>
              </div>
            </div>
          )}

          <p className="page-note rs-foot" style={{ marginTop: "var(--space-3)" }}>
            {live
              ? "Responses are live: an automatic response carries out the action and immediately signs it into the audit ledger."
              : "Demo environment sandbox: automatic responses record the action payload into the audit record as a dry-run."}
          </p>
        </>
      )}

      {confirm && (
        <div className="rs-backdrop" role="presentation" onClick={() => setConfirm(null)}>
          <div
            className="rs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rs-confirm-title"
            ref={dialogRef}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="rs-confirm-title" className="rs-dialog-title">
              Enable Automatic Execution?
            </h2>
            <p className="rs-dialog-body">
              When the deterministic trigger condition is met, this response will execute automatically without requiring human confirmation.
            </p>
            <p className="rs-dialog-quote">{confirm.sentence}</p>
            <p className="rs-dialog-body">
              {live
                ? "The action will be executed on live systems and permanently signed into the audit record."
                : "In this demo sandbox, the action payload will be signed to the ledger without external system side-effects."}
            </p>
            <div className="rs-dialog-actions">
              <button
                type="button"
                className="btn btn-plain"
                ref={cancelRef}
                onClick={() => {
                  setConfirm(null);
                  returnFocus.current?.focus();
                }}
              >
                Keep Suggest Only
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const row = confirm;
                  setConfirm(null);
                  void save(row, "automatic");
                  returnFocus.current?.focus();
                }}
              >
                Turn On Automatic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
