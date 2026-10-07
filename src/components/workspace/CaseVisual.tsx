"use client";

import { useEffect, useRef, useState } from "react";
import type { Alert, EvidenceItem } from "@/core/types";
import { formatDay, formatLimit, formatShort, formatUsd } from "@/lib/format";
import { DOC_LABELS } from "./case-text";

/* ------------------------------------------------------------------ */
/* Threshold charts (event alerts with a number against a line)        */
/* ------------------------------------------------------------------ */

interface ThresholdSpec {
  title: string;
  caption: string;
  /** Bar labels when there is more than one mark. */
  labels?: string[];
  values: number[];
  thresholdLabel: string;
  threshold: number;
  format: (value: number) => string;
}

const usd = (value: number): string => `USD ${formatUsd(value)}`;

function thresholdSpec(alert: Alert): ThresholdSpec | null {
  const observed = alert.result.observed;
  const parameters = alert.result.parameters;

  switch (alert.ruleId) {
    case "AML-001": {
      const amounts = [...String(observed["amountsText"] ?? "").matchAll(/([\d,]+\.\d{2})/g)].map(
        (match) => Number(match[1].replace(/,/g, "")),
      );
      const limit = Number(observed["limit"] ?? NaN);
      if (amounts.length === 0 || Number.isNaN(limit)) return null;
      const total = Number(observed["totalAmount"] ?? NaN);
      return {
        title: "Deposits against the reporting limit",
        caption:
          `Each bar is one deposit; the dashed line is the USD ${formatLimit(limit)} reporting limit. ` +
          (Number.isNaN(total) ? "" : `Together they total USD ${formatUsd(total)} in ${String(observed["spanHours"])} hours. `) +
          "Neither deposit crosses the line on its own.",
        labels: amounts.map((_, index) => `Deposit ${index + 1}`),
        values: amounts,
        thresholdLabel: "Reporting limit",
        threshold: limit,
        format: usd,
      };
    }
    case "FIN-001": {
      const amount = Number(observed["amount"] ?? NaN);
      const threshold = Number(observed["threshold"] ?? NaN);
      if (Number.isNaN(amount) || Number.isNaN(threshold)) return null;
      return {
        title: "Payment against the approval threshold",
        caption: `The bar is the payment; the dashed line is the level above which ${String(observed["requiredApprovers"])} approvals are required.`,
        labels: ["Payment"],
        values: [amount],
        thresholdLabel: "Approval threshold",
        threshold,
        format: usd,
      };
    }
    case "IAM-001": {
      const hours = Number(observed["hoursApart"] ?? NaN);
      const window = Number(parameters["windowHours"] ?? NaN);
      if (Number.isNaN(hours) || Number.isNaN(window)) return null;
      return {
        title: "Commit and production change against the window",
        caption: `The bar is the time between the commit and the production change; the dashed line is the ${String(window)}-hour window the rule watches.`,
        labels: ["Hours apart"],
        values: [hours],
        thresholdLabel: "Allowed window",
        threshold: window,
        format: (value) => `${value} hours`,
      };
    }
    case "DEV-001": {
      const entropy = Number(observed["entropy"] ?? NaN);
      const threshold = Number(parameters["entropyThreshold"] ?? NaN);
      if (Number.isNaN(entropy) || Number.isNaN(threshold)) return null;
      return {
        title: "The string against the secret level",
        caption:
          "The bar is how random the hard-coded string looked; the dashed line is the level above which a string counts as a secret.",
        labels: ["Measured string"],
        values: [entropy],
        thresholdLabel: "Secret level",
        threshold,
        format: (value) => String(value),
      };
    }
    default:
      return null;
  }
}

function ThresholdChart({ spec }: { spec: ThresholdSpec }) {
  const width = 560;
  const height = 196;
  const left = 10;
  const right = 10;
  const top = 30;
  const bottom = 56;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const base = top + plotHeight;
  const max = Math.max(...spec.values, spec.threshold) * 1.18;
  const y = (value: number): number => top + plotHeight * (1 - value / max);
  const slot = plotWidth / spec.values.length;
  const barWidth = Math.min(spec.values.length > 1 ? 72 : 104, slot * 0.52);
  const labels = spec.labels ?? spec.values.map(() => "Value");

  return (
    <figure className="wb-visual">
      <figcaption className="wb-visual-title">{spec.title}</figcaption>
      <svg
        className="vis-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${spec.title}. ${spec.caption}`}
      >
        <line className="vis-threshold" x1={left} x2={width - right} y1={y(spec.threshold)} y2={y(spec.threshold)} />
        {/* With several bars the label sits in the gap between the first two
            slots so it never collides with a value label above a bar. */}
        <text
          x={spec.values.length > 1 ? left + slot : width - right}
          y={y(spec.threshold) - 8}
          textAnchor={spec.values.length > 1 ? "middle" : "end"}
        >
          {spec.thresholdLabel}: {spec.format(spec.threshold)}
        </text>
        <line className="vis-axis" x1={left} x2={width - right} y1={base} y2={base} />
        {spec.values.map((value, index) => {
          const center = left + slot * index + slot / 2;
          return (
            <g key={index}>
              <rect className="vis-bar" x={center - barWidth / 2} y={y(value)} width={barWidth} height={base - y(value)} rx={2} />
              {/* Labels sit under the axis (name + amount on two lines) so the
                  threshold annotation above the plot can never collide with a
                  value label, at any type size. */}
              <text x={center} y={base + 20} textAnchor="middle">
                {labels[index]}
              </text>
              <text className="vis-value" x={center} y={base + 42} textAnchor="middle">
                {spec.format(value)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="vis-caption">{spec.caption}</p>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Date timeline (state alerts and the response window fallback)       */
/* ------------------------------------------------------------------ */

interface DatePoint {
  iso: string;
  label: string;
  kind: "start" | "end" | "today";
  past?: boolean;
}

interface DateBand {
  fromIso: string;
  toIso: string;
  label: string;
  overdue?: boolean;
}

interface DateSpec {
  title: string;
  caption: string;
  points: DatePoint[];
  band?: DateBand;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function dateSpec(alert: Alert, asOf: string, snapshot: EvidenceItem | undefined): DateSpec {
  const observed = alert.result.observed;
  const registers =
    snapshot && snapshot.content && typeof snapshot.content === "object"
      ? (snapshot.content as { registers?: Record<string, Array<Record<string, unknown>>> }).registers
      : undefined;

  const endIso =
    typeof observed["expiresOn"] === "string" && observed["expiresOn"] !== "none"
      ? observed["expiresOn"]
      : typeof observed["dueOn"] === "string"
        ? observed["dueOn"]
        : null;

  if (!endIso) {
    const left = timeLeftText(asOf, alert.slaDueAt);
    return {
      title: "Response window",
      caption: `Nothing is on file to date, so the timeline is the response window: raised ${formatShort(alert.createdAt)}, due by ${formatShort(alert.slaDueAt)}. ${left.text}.`,
      points: [
        { iso: alert.createdAt, label: "Alert raised", kind: "start" },
        { iso: alert.slaDueAt, label: "Response due", kind: "end", past: Date.parse(alert.slaDueAt) < Date.parse(asOf) },
      ],
      band: {
        fromIso: asOf,
        toIso: alert.slaDueAt,
        label: left.text,
        overdue: left.overdue,
      },
    };
  }

  const overdue = Date.parse(endIso) < Date.parse(asOf);
  const days = Math.abs(daysBetween(endIso, asOf));
  const dayWord = days === 1 ? "day" : "days";
  const bandLabel =
    alert.ruleId === "DEAD-001"
      ? overdue
        ? `Overdue · ${days} ${dayWord}`
        : days === 0
          ? "Due today"
          : `${days} ${dayWord} left`
      : overdue
        ? `Expired ${days} ${dayWord} ago`
        : days === 0
          ? "Expires today"
          : `${days} ${dayWord} left`;

  const points: DatePoint[] = [];
  let title = "Dates against today";
  let caption = `The date the rule watched, against today (${formatDay(asOf)}).`;

  if (alert.ruleId === "CERT-001") {
    const certType = String(observed["certType"] ?? "required");
    const issued = registers?.["certifications"]
      ?.filter(
        (row) =>
          row["personId"] === alert.subject.id &&
          row["type"] === certType &&
          row["expiresOn"] === observed["expiresOn"],
      )
      .map((row) => String(row["issuedOn"] ?? ""))
      .find((iso) => iso.length > 0);
    if (issued) points.push({ iso: issued, label: "Certificate issued", kind: "start" });
    title = `${certType} certification against today`;
    caption = `When the ${certType} certificate was valid, when it runs out, and where today sits.`;
  } else if (alert.ruleId === "VEND-001") {
    const docType = String(observed["docType"] ?? "");
    const validFrom = registers?.["vendors"]
      ?.filter((row) => row["id"] === alert.subject.id)
      .flatMap((row) => (Array.isArray(row["documents"]) ? row["documents"] : []))
      .filter((doc) => doc && typeof doc === "object" && (doc as Record<string, unknown>)["type"] === docType)
      .map((doc) => String((doc as Record<string, unknown>)["validFrom"] ?? ""))
      .find((iso) => iso.length > 0);
    if (validFrom) points.push({ iso: validFrom, label: "Document valid from", kind: "start" });
    const label = DOC_LABELS[docType] ?? "Vendor document";
    title = `${label} against today`;
    caption = `When the ${label.toLowerCase()} was valid and where today sits.`;
  } else if (alert.ruleId === "DEAD-001") {
    title = "Deadline against today";
    caption = `“${String(observed["obligationTitle"] ?? "The obligation")}” and where today sits.`;
  }

  points.push({
    iso: endIso,
    label: overdue
      ? alert.ruleId === "DEAD-001"
        ? "Was due"
        : "Expired"
      : alert.ruleId === "DEAD-001"
        ? "Due"
        : "Expires",
    kind: "end",
    past: overdue,
  });
  points.push({ iso: asOf, label: "Today", kind: "today" });

  return {
    title,
    caption,
    points,
    band: { fromIso: endIso, toIso: asOf, label: bandLabel, overdue },
  };
}

function timeLeftText(from: string, to: string): { text: string; overdue: boolean } {
  const diff = Date.parse(to) - Date.parse(from);
  if (diff <= 0) {
    const abs = Math.abs(diff);
    const hours = Math.floor(abs / 3_600_000);
    const minutes = Math.floor((abs % 3_600_000) / 60_000);
    return {
      text: hours > 0 ? `${hours}h ${minutes}m overdue` : `${minutes}m overdue`,
      overdue: true,
    };
  }
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { text: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`, overdue: false };
}

/* Labels sit in one row of 120px boxes centered on their mark. When two
   marks are closer than that, the later one drops to a second row so the
   text never overlaps (e.g. an expiry and today, days apart on a long
   span). Width is measured so the gap is exact at any container size. */
function assignLabelRows(positions: number[], containerWidth: number): boolean[] {
  const rows = positions.map(() => false);
  if (containerWidth <= 0) return rows;
  const minGap = 120;
  const ordered = positions
    .map((percent, index) => ({ index, px: (percent / 100) * containerWidth }))
    .sort((a, b) => a.px - b.px);
  const rowLast = [-Infinity, -Infinity];
  for (const { index, px } of ordered) {
    if (px - rowLast[0] >= minGap) {
      rowLast[0] = px;
    } else if (px - rowLast[1] >= minGap) {
      rows[index] = true;
      rowLast[1] = px;
    } else {
      const low = px - rowLast[0] < px - rowLast[1];
      rows[index] = low;
      rowLast[low ? 1 : 0] = px;
    }
  }
  return rows;
}

function DateChart({ spec }: { spec: DateSpec }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setContainerWidth(entries[0]?.contentRect.width ?? 0),
    );
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const times = spec.points.map((point) => Date.parse(point.iso));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1);
  const pad = 0.1;
  const position = (iso: string): number =>
    (pad + ((Date.parse(iso) - min) / span) * (1 - 2 * pad)) * 100;

  const bandLeft = Math.min(position(spec.band?.fromIso ?? spec.points[0].iso), position(spec.band?.toIso ?? spec.points[0].iso));
  const bandRight = Math.max(position(spec.band?.fromIso ?? spec.points[0].iso), position(spec.band?.toIso ?? spec.points[0].iso));

  const lowRow = assignLabelRows(
    spec.points.map((point) => position(point.iso)),
    containerWidth,
  );
  const staggered = lowRow.some(Boolean);

  return (
    <figure className="wb-visual">
      <figcaption className="wb-visual-title">{spec.title}</figcaption>
      <div
        ref={containerRef}
        className={`dt${staggered ? " is-staggered" : ""}`}
        role="img"
        aria-label={`${spec.title}. ${spec.caption}`}
      >
        <span className="dt-line" />
        {spec.band && (
          <>
            <span
              className={`dt-band${spec.band.overdue ? " is-overdue" : ""}`}
              style={{ left: `${bandLeft}%`, width: `${bandRight - bandLeft}%` }}
            />
            <span
              className={`dt-band-label${spec.band.overdue ? " is-overdue" : ""}`}
              style={{ left: `${(bandLeft + bandRight) / 2}%` }}
            >
              {spec.band.label}
            </span>
          </>
        )}
        {spec.points.map((point, index) => (
          <span
            className={`dt-mark${lowRow[index] ? " is-low" : ""}`}
            key={`${point.label}_${point.iso}`}
            style={{ left: `${position(point.iso)}%` }}
          >
            <span
              className={`dt-dot${point.kind === "today" ? " is-today" : ""}${point.past ? " is-past" : ""}`}
            />
            <span className={`dt-label${point.past ? " is-overdue" : ""}`}>
              <strong>{point.label}</strong>
              {formatDay(point.iso)}
            </span>
          </span>
        ))}
      </div>
      <p className="vis-caption">{spec.caption}</p>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The workbench's one visual (DESIGN §7.2): a threshold chart for event
 * alerts with a number, a date timeline for state alerts, otherwise the
 * response window as a timeline.
 */
export function CaseVisual({
  alert,
  asOf,
  snapshot,
}: {
  alert: Alert;
  asOf: string;
  snapshot: EvidenceItem | undefined;
}) {
  const threshold = thresholdSpec(alert);
  if (threshold) return <ThresholdChart spec={threshold} />;
  return <DateChart spec={dateSpec(alert, asOf, snapshot)} />;
}
