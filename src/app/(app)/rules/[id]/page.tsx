"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { ErrorDroppedLink, SpotCode } from "@/components/illustration/scenes";
import { SeverityDot, StatusDot } from "@/components/signature/SeverityDot";
import { DOMAIN_LABELS } from "@/components/workspace/nav";
import type { RuleCard, SampleCard } from "@/lib/rule-copy";
import { arrayParamToText, paramLabel, plainDescription, textToArrayParam } from "@/lib/rule-copy";
import { formatDay } from "@/lib/format";

type Phase = "loading" | "ready" | "error";
type RunState = "idle" | "running" | "done" | "failed";

interface SampleLine {
  subjectId: string;
  subjectName: string;
  firstFiresAt: number;
  stopsAt: number | null;
  sentence: string;
  severity: "critical" | "high" | "medium" | "low";
  riskPoints: number;
  riskReasons: string[];
}

interface SampleRun {
  ruleId: string;
  scenarioId: string;
  leg: "sample" | "control";
  title: string;
  note: string;
  asOf: string;
  stepCount: number;
  total: number;
  firing: number;
  stopped: number;
  lines: SampleLine[];
}

function initialParams(rule: RuleCard): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(rule.defaultParams)) {
    if (value === null || typeof value === "object") {
      values[key] = Array.isArray(value) ? arrayParamToText(value) : "";
      continue;
    }
    values[key] = String(value);
  }
  return values;
}

function runHeadline(run: SampleRun): string {
  if (run.total === 0) return "This rule looked at no records in this sample.";
  if (run.firing === 0 && run.stopped === 0) {
    return "No record triggers this rule in this sample.";
  }
  if (run.firing === 0) return "No record triggers this rule when the sample ends.";
  if (run.total === 1) return "This sample has one record, and the rule triggers on it.";
  if (run.firing === run.total) {
    return `All ${run.total} records trigger this rule when the sample ends.`;
  }
  return `${run.firing} of ${run.total} records trigger this rule when the sample ends.`;
}

function stoppedNote(stopped: number): string {
  const subject = stopped === 1 ? "1 more record triggers" : `${stopped} more records trigger`;
  const verb = stopped === 1 ? "stops" : "stop";
  return `${subject} it during the sample and ${verb} before it ends.`;
}

/**
 * Rule detail (DESIGN §7): plain description first, parameters second,
 * "Try it on a sample" third. The sample runs the real rule module over the
 * demo scenario on a private copy of the records, so the verdicts are the
 * rule's own and the demo state never moves.
 */
export default function RuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [rule, setRule] = useState<RuleCard | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [runState, setRunState] = useState<RunState>("idle");
  const [run, setRun] = useState<SampleRun | null>(null);
  const [runError, setRunError] = useState("");
  const [leg, setLeg] = useState<"sample" | "control">("sample");

  const load = useRef(async (ruleId: string) => {
    setPhase("loading");
    try {
      const response = await fetch("/api/rules");
      if (!response.ok) throw new Error("This rule could not be loaded.");
      const data = (await response.json()) as { rules: RuleCard[] };
      const found = data.rules.find((candidate) => candidate.id === ruleId) ?? null;
      setRule(found);
      if (found) setValues(initialParams(found));
      setPhase("ready");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "This rule could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current(id);
  }, [id]);

  const card: SampleCard | null = leg === "control" ? rule?.control ?? null : rule?.sample ?? null;

  const sampleParams = useMemo(() => {
    if (!rule) return {};
    const params: Record<string, string | number | string[]> = {};
    for (const [key, value] of Object.entries(rule.defaultParams)) {
      if (Array.isArray(value)) {
        params[key] = textToArrayParam(values[key] ?? "");
      } else if (typeof value === "number") {
        const parsed = Number(values[key]);
        params[key] = Number.isFinite(parsed) ? parsed : value;
      } else if (typeof value === "string") {
        params[key] = values[key] ?? value;
      }
    }
    return params;
  }, [rule, values]);

  async function runSample(which: "sample" | "control") {
    if (!rule) return;
    setLeg(which);
    setRunState("running");
    setRunError("");
    setRun(null);
    try {
      const response = await fetch(`/api/rules/${rule.id}/try`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leg: which, params: sampleParams }),
      });
      if (!response.ok) throw new Error("The sample could not be run.");
      setRun((await response.json()) as SampleRun);
      setRunState("done");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "The sample could not be run.");
      setRunState("failed");
    }
  }

  const severityWord = rule
    ? rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)
    : "";

  return (
    <div className="page-case-room">
      <Link className="wb-back" href="/rules">
        Back to rules
      </Link>

      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">{rule?.name ?? "Rule"}</h1>
          <p className="page-serif-headline">
            {phase === "error"
              ? "This rule could not be loaded."
              : phase === "loading"
                ? "Opening this rule…"
                : !rule
                  ? "That rule is not on file."
                  : `A ${severityWord} severity ${
                      DOMAIN_LABELS[rule.domain] ?? rule.domain
                    } rule, run on every check and re-runnable here on a sample.`}
          </p>
          <p className="page-note">
            {phase === "ready" && rule ? (
              <>
                <span className="rt-id">{rule.id}</span>
                {" · "}
                {DOMAIN_LABELS[rule.domain] ?? rule.domain} · Change a parameter below, then run the
                sample to see what it changes.
              </>
            ) : (
              "Every rule states in plain words what it looks for, before any code."
            )}
          </p>
        </div>
        <div className="page-spot" aria-hidden="true">
          {phase === "error" ? <ErrorDroppedLink size={96} /> : <SpotCode size={96} />}
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="rules" />

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true" aria-label="Loading this rule">
          {[0, 1, 2].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block hide-sm" />
            </div>
          ))}
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>{runError}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load.current(id)}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && !rule && (
        <div className="state-block">
          <p>That rule is not on file.</p>
          <p>Only the eight Tier 1 rules ship with this demo.</p>
        </div>
      )}

      {phase === "ready" && rule && (
        <>
          <h2 className="section-label-case-room">What it looks for</h2>
          <p className="rt-desc">{plainDescription(rule.id, rule.description)}</p>
          <p className="page-note">How the rule states it: {rule.description}</p>

          <h2 className="section-label-case-room">Parameters</h2>
          <div className="rt-params">
            {Object.keys(rule.defaultParams).map((key) => (
                <label key={key} className="rt-param">
                  <span>{paramLabel(rule.id, key)}</span>
                  <input
                    type={typeof rule.defaultParams[key] === "number" ? "number" : "text"}
                    value={values[key] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </label>
              ))}
            <div className="rt-param-actions">
              <button
                type="button"
                className="btn btn-plain"
                onClick={() => setValues(initialParams(rule))}
              >
                Reset to defaults
              </button>
              <span className="page-note">
                Change a value, then run the sample again to see what it changes.
              </span>
            </div>
          </div>

          <h2 className="section-label-case-room">Try it on a sample</h2>
          <div className="rt-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runSample("sample")}
              disabled={runState === "running"}
            >
              Run the sample
            </button>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => void runSample("control")}
              disabled={runState === "running"}
            >
              Run the control
            </button>
            <span className="toolbar-spacer" />
            <span className="page-note">
              The control is the same records with the problem fixed, and must trigger nothing.
            </span>
          </div>

          {card && (
            <div className="rt-steps">
              <p className="rt-steps-title">{card.title}</p>
              <ol className="rt-step-list">
                {card.steps.map((step, index) => (
                  <li key={`${step.kind}-${index}`}>
                    <span className="rt-step-num">{index + 1}</span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
              {card.note && <p className="page-note">{card.note}</p>}
            </div>
          )}

          {runState === "running" && (
            <div className="alerts-table" aria-busy="true">
              {[0, 1].map((index) => (
                <div className="skeleton-row" key={index}>
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                </div>
              ))}
            </div>
          )}

          {runState === "failed" && (
            <div className="error-block">
              <p>{runError}</p>
              <button type="button" className="btn btn-plain" onClick={() => void runSample(leg)}>
                Try again
              </button>
            </div>
          )}

          {runState === "done" && run && (
            <div className="rt-result">
              <p className="rt-result-head">{runHeadline(run)}</p>
              {run.stopped > 0 && (
                <p className="page-note">{stoppedNote(run.stopped)}</p>
              )}
              <p className="page-note">
                Run on a copy of the records as of {formatDay(run.asOf)}, so the demo itself did not
                change.
              </p>

              {run.lines.length === 0 ? (
                <div className="state-block rt-state">
                  <p>Nothing to show: this rule never triggered.</p>
                  <p>That is the result for {run.leg === "control" ? "the control" : "this sample"}.</p>
                </div>
              ) : (
                <div className="alerts-table">
                  <div className="alerts-row alerts-head rt-line-head">
                    <span>Record</span>
                    <span>What the rule saw</span>
                    <span>State</span>
                    <span>Severity</span>
                  </div>
                  {run.lines.map((line) => (
                    <div className="alerts-row rt-line" key={`${line.subjectId}-${line.firstFiresAt}`}>
                      <span className="reg-name">
                        <span className="row-primary">{line.subjectName}</span>
                        <span className="row-secondary">
                          First triggers at step {line.firstFiresAt}
                        </span>
                      </span>
                      <span className="rt-sentence">
                        <span>{line.sentence}</span>
                        {line.riskReasons.length > 0 && (
                          <span className="rt-why">
                            Score moves by {line.riskPoints}: {line.riskReasons.join("; ")}
                          </span>
                        )}
                      </span>
                      <span className="row-cell">
                        <StatusDot
                          label={line.stopsAt ? `Stops at step ${line.stopsAt}` : "Still triggers"}
                          tone={line.stopsAt ? "neutral" : "critical"}
                        />
                      </span>
                      <span className="row-cell">
                        <SeverityDot severity={line.severity} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
