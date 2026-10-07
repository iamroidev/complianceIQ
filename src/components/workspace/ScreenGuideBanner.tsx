"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, HelpCircle, CheckCircle2 } from "lucide-react";

interface GuideItem {
  label: string;
  desc: string;
  tone?: "critical" | "warning" | "success" | "neutral";
}

interface ScreenGuideBannerProps {
  screenId: string;
  title: string;
  subtitle: string;
  indicators?: GuideItem[];
  actionPrompt?: string;
}

/**
 * ScreenGuideBanner (DESIGN §27.5, §28.6, §29):
 * Provides calm, clear, plain-language guidance on what the current screen does,
 * what the colors/badges mean, and what action the officer or auditor should take.
 * Especially helpful for first-time or non-technical users.
 */
export function ScreenGuideBanner({
  screenId,
  title,
  subtitle,
  indicators = [],
  actionPrompt,
}: ScreenGuideBannerProps) {
  const storageKey = `ciq-guide-open-${screenId}`;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setIsOpen(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // Ignore
    }
  };

  return (
    <div className={`screen-guide-card${isOpen ? " is-open" : " is-collapsed"}`}>
      <div className="screen-guide-header" onClick={toggle} role="button" tabIndex={0}>
        <div className="screen-guide-title-row">
          <span className="guide-icon-pill" aria-hidden="true">
            <BookOpen size={16} />
          </span>
          <span className="guide-heading">How this screen works: {title}</span>
        </div>

        <button
          type="button"
          className="guide-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Minimize screen guide" : "Expand screen guide"}
        >
          {isOpen ? (
            <>
              <span>Hide guide</span>
              <ChevronUp size={15} />
            </>
          ) : (
            <>
              <span>Show guide</span>
              <ChevronDown size={15} />
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="screen-guide-body">
          <p className="screen-guide-summary">{subtitle}</p>

          {indicators.length > 0 && (
            <div className="screen-guide-indicators">
              {indicators.map((ind) => (
                <div key={ind.label} className="guide-indicator-item">
                  <span className={`guide-pip pip-${ind.tone ?? "neutral"}`} />
                  <span className="guide-ind-label">{ind.label}:</span>
                  <span className="guide-ind-desc">{ind.desc}</span>
                </div>
              ))}
            </div>
          )}

          {actionPrompt && (
            <div className="screen-guide-action-row">
              <CheckCircle2 size={16} className="guide-action-icon" />
              <span className="guide-action-text">
                <strong>Next step:</strong> {actionPrompt}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
