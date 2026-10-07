"use client";

import { useMemo } from "react";
import type { CoverageItem, Obligation } from "@/core/types";
import { getRule } from "@/core/engine/rules";

interface CoveragePinboardProps {
  items: CoverageItem[];
  obligations: Map<string, Obligation>;
  selectedId?: string | null;
  onSelect: (item: CoverageItem, obligation?: Obligation) => void;
  onConnectRule?: (item: CoverageItem) => void;
}

/**
 * CoveragePinboard (DESIGN §28.4, §29.7):
 * The pinboard: obligation cards pinned to a cork-free cream board.
 * - Checked ones: pinned with teal thread to a small rule tag ("Checked by FIN-001")
 * - Partly checked: pinned with thread stopping halfway
 * - Gaps: loose card with dangling dashed thread and terracotta warning ("No automated check")
 */
export function CoveragePinboard({
  items,
  obligations,
  selectedId,
  onSelect,
  onConnectRule,
}: CoveragePinboardProps) {
  // Take a curated layout slice for visual pinboard view (first 12 items or selected)
  const displayItems = useMemo(() => {
    // Make sure we show a balanced mix of covered, partial, and gap cards
    const gaps = items.filter((i) => i.status === "gap");
    const partials = items.filter((i) => i.status === "partial");
    const covered = items.filter((i) => i.status === "covered");

    const sample = [
      ...gaps.slice(0, 4),
      ...partials.slice(0, 3),
      ...covered.slice(0, 5),
    ];
    return sample;
  }, [items]);

  return (
    <div className="coverage-pinboard-container" aria-label="Policy coverage pinboard">
      {/* Board Surface Frame */}
      <div className="pinboard-frame">
        {/* Subtle Cork / Cream Paper Board Grid */}
        <div className="pinboard-surface">
          <div className="pinboard-grid">
            {displayItems.map((item, index) => {
              const obligation = obligations.get(item.obligationId);
              const isSelected = selectedId === item.obligationId;
              const ruleName = item.ruleIds.map((id) => getRule(id)?.meta.name ?? id).join(", ");
              const isGap = item.status === "gap";
              const isPartial = item.status === "partial";
              const isCovered = item.status === "covered";

              // Subtle natural rotation for pinboard realism (-1.5deg to 1.5deg)
              const rotation = (index % 5 - 2) * 0.8;

              return (
                <div
                  key={item.obligationId}
                  className={`pinboard-card status-${item.status}${
                    isSelected ? " is-selected" : ""
                  }`}
                  style={{
                    transform: isSelected
                      ? "scale(1.03) translateY(-4px)"
                      : `rotate(${rotation}deg)`,
                  }}
                  onClick={() => onSelect(item, obligation)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(item, obligation);
                    }
                  }}
                >
                  {/* Pushpin at top center */}
                  <div className="card-pin" aria-hidden="true">
                    <span className={`pin-head ${item.status}`} />
                  </div>

                  {/* Connecting Thread Simulation */}
                  <div className="card-thread-anchor" aria-hidden="true">
                    {isCovered && (
                      <svg className="thread-svg full" viewBox="0 0 100 30">
                        <path
                          d="M 10 5 Q 50 25 90 10"
                          fill="none"
                          stroke="var(--ill-teal)"
                          strokeWidth="2.5"
                        />
                      </svg>
                    )}
                    {isPartial && (
                      <svg className="thread-svg half" viewBox="0 0 100 30">
                        <path
                          d="M 10 5 Q 35 22 55 14"
                          fill="none"
                          stroke="var(--ill-ochre)"
                          strokeWidth="2"
                        />
                        <circle cx="55" cy="14" r="3" fill="var(--ill-ochre)" />
                      </svg>
                    )}
                    {isGap && (
                      <svg className="thread-svg gap" viewBox="0 0 100 35">
                        <path
                          d="M 10 5 Q 25 25 40 30"
                          fill="none"
                          stroke="var(--ill-terracotta)"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                        />
                        <circle cx="40" cy="30" r="2.5" fill="var(--ill-terracotta)" />
                      </svg>
                    )}
                  </div>

                  {/* Status Ribbon Tag */}
                  <div className="card-status-row">
                    <span className={`card-status-badge badge-${item.status}`}>
                      {isCovered ? "Checked" : isPartial ? "Partly checked" : "No automated check"}
                    </span>
                    <span className="card-domain-tag">
                      {obligation?.source?.documentId?.replace("doc_", "") ?? "policy"}
                    </span>
                  </div>

                  {/* Obligation Title */}
                  <h3 className="card-title">
                    {obligation?.plainDescription ?? item.obligationId}
                  </h3>

                  {/* Policy Quote Highlight */}
                  {obligation?.source?.quote && (
                    <blockquote className="card-quote-highlight">
                      “{obligation.source.quote}”
                    </blockquote>
                  )}

                  {/* Footer Connection Tag */}
                  <div className="card-footer-rule">
                    {isCovered ? (
                      <span className="rule-tag tag-covered">
                        <span className="rule-pip" />
                        Rule: {ruleName}
                      </span>
                    ) : isPartial ? (
                      <span className="rule-tag tag-partial">
                        <span className="rule-pip" />
                        Partial: {ruleName}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="rule-connect-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConnectRule?.(item);
                        }}
                      >
                        + Connect to a rule
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
