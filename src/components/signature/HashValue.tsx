"use client";

import { useState } from "react";

/**
 * Hash display (DESIGN.md §4): Geist Mono 12px, shortened, click to copy.
 * Mono is allowed only for hashes and record IDs.
 */
export function HashValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const shortened = `${value.slice(0, 4)}…${value.slice(-4)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard unavailable (e.g. permissions); fail quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : value}
      style={{
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: "var(--fs-hash)",
        background: "none",
        border: "none",
        padding: 0,
        color: "var(--text-2)",
        cursor: "pointer",
        letterSpacing: 0,
      }}
    >
      {copied ? "Copied" : shortened}
    </button>
  );
}
