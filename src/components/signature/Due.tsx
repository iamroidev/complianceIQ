"use client";

import { useMemo } from "react";
import { Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { formatDay } from "@/lib/format";

export type DueLevel = "calm" | "soon" | "urgent" | "now";

interface DueProps {
  /** Target date/time string (ISO or YYYY-MM-DD) */
  target: string;
  /** Demo clock baseline date/time string (ISO or YYYY-MM-DD) */
  asOf?: string;
  /** Whether the obligation/item is already completed */
  completed?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Show absolute date next to countdown (default true) */
  showAbsolute?: boolean;
}

/**
 * Computes human-style time description and level per DESIGN §30.2
 */
export function computeDueInfo(target: string, asOf?: string, completed?: boolean) {
  if (completed) {
    return {
      level: "calm" as DueLevel,
      humanText: "Completed",
      absoluteText: formatDay(target),
      isOverdue: false,
      diffHours: 999999,
      diffDays: 999999,
    };
  }

  const targetMs = Date.parse(target.length === 10 ? `${target}T23:59:59Z` : target);
  const nowMs = asOf ? Date.parse(asOf) : Date.now();
  const diffMs = targetMs - nowMs;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Determine Level per §30.2 table
  let level: DueLevel = "calm";
  let humanText = "";
  const isOverdue = diffMs < 0;

  if (isOverdue) {
    level = "now";
    const overDays = Math.abs(diffDays);
    const overHours = Math.abs(Math.round(diffHours));
    humanText =
      overDays >= 1
        ? `Overdue by ${overDays} ${overDays === 1 ? "day" : "days"}`
        : `Overdue by ${overHours} ${overHours === 1 ? "hour" : "hours"}`;
  } else if (diffHours <= 4) {
    level = "now";
    const mins = Math.max(Math.round(diffMs / (1000 * 60)), 1);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    humanText =
      hours > 0
        ? `Due in ${hours}h ${remMins}m`
        : `Due in ${mins} minutes`;
  } else if (diffHours <= 24) {
    level = "urgent";
    const hours = Math.round(diffHours);
    humanText = `Due in ${hours} hours`;
  } else if (diffDays <= 7) {
    level = "soon";
    humanText = `Due in ${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  } else {
    level = "calm";
    humanText = `Due ${formatDay(target)}`;
  }

  const absoluteText = formatDay(target);

  return {
    level,
    humanText,
    absoluteText,
    isOverdue,
    diffHours,
    diffDays,
  };
}

/**
 * Universal <Due /> component (§30.2):
 * Computes urgency level: Calm (>7d) · Soon (≤7d) · Urgent (≤24h) · Now (≤4h or overdue).
 * Always an icon + words + colour (never colour alone).
 */
export function Due({
  target,
  asOf,
  completed = false,
  className = "",
  showAbsolute = true,
}: DueProps) {
  const info = useMemo(
    () => computeDueInfo(target, asOf, completed),
    [target, asOf, completed],
  );

  const { level, humanText, absoluteText, isOverdue } = info;

  if (completed) {
    return (
      <span className={`due-badge level-calm is-completed ${className}`}>
        <span className="due-human">{humanText}</span>
        {showAbsolute && <span className="due-absolute">({absoluteText})</span>}
      </span>
    );
  }

  return (
    <span
      className={`due-badge level-${level}${isOverdue ? " is-overdue" : ""} ${className}`}
      data-level={level}
      title={`${humanText} · Absolute date: ${absoluteText}`}
    >
      {level === "now" ? (
        <AlertCircle size={15} className="due-icon" aria-hidden="true" />
      ) : level === "urgent" ? (
        <AlertTriangle size={15} className="due-icon" aria-hidden="true" />
      ) : level === "soon" ? (
        <Clock size={15} className="due-icon" aria-hidden="true" />
      ) : null}

      <span className="due-human">{humanText}</span>

      {showAbsolute && level !== "calm" && (
        <span className="due-absolute">{absoluteText}</span>
      )}
    </span>
  );
}
