"use client";

import { useState } from "react";

/**
 * Source link (DESIGN.md §6.1). Every derived number has a dotted underline;
 * hover or focus shows where the number came from. Clicking will later
 * highlight the underlying activity in the side panel.
 */
export function SourceLink({
  source,
  children,
  onOpen,
}: {
  source: string;
  children: React.ReactNode;
  onOpen?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          cursor: "help",
          padding: 0,
          background: "none",
          border: "none",
          color: "inherit",
          font: "inherit",
          borderBottom: "1px dotted var(--text-3)",
        }}
      >
        {children}
      </button>
      {hovered && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "0",
            background: "var(--nav-bg)",
            color: "var(--nav-text)",
            fontSize: "var(--fs-label)",
            lineHeight: "18px",
            padding: "4px 8px",
            borderRadius: "var(--r-control)",
            whiteSpace: "nowrap",
            zIndex: 10,
            animation: "fadeIn var(--dur-fast) var(--ease-out)",
          }}
        >
          Source: {source}
        </span>
      )}
    </span>
  );
}
