"use client";

import { useEffect, useState } from "react";

type TokenMap = Record<string, string>;

const PROPS = [
  "--bg",
  "--surface",
  "--surface-2",
  "--nav-bg",
  "--cta",
  "--verified",
  "--high",
  "--medium",
  "--low",
] as const;

function readTokens(): TokenMap {
  const cs = getComputedStyle(document.documentElement);
  const out: TokenMap = {};
  for (const p of PROPS) out[p] = cs.getPropertyValue(p).trim().toUpperCase();
  return out;
}

function Swatch({
  hex,
  name,
  role,
  usage,
  large = false,
}: {
  hex: string;
  name: string;
  role: string;
  usage: string;
  large?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
      <div
        aria-hidden="true"
        style={{
          width: large ? "140px" : "56px",
          height: large ? "88px" : "40px",
          background: hex,
          border: "1px solid var(--line)",
          borderRadius: "var(--r-control)",
          flexShrink: 0,
        }}
      />
      <div>
        <p style={{ fontWeight: 500 }}>
          {name} <span style={{ color: "var(--text-3)" }}>{hex}</span>
        </p>
        <p style={{ color: "var(--text-2)" }}>{role}</p>
        <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)" }}>
          {usage}
        </p>
      </div>
    </div>
  );
}

export function ThemeSwatches() {
  const [tokens, setTokens] = useState<TokenMap | null>(null);

  useEffect(() => {
    const update = () => setTokens(readTokens());
    update();
    document.addEventListener("ciq-theme-change", update);
    return () => document.removeEventListener("ciq-theme-change", update);
  }, []);

  if (!tokens) return null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          marginBottom: "32px",
        }}
      >
        <Swatch
          hex={tokens["--bg"]}
          name="Canvas"
          role="60% — primary background"
          usage="Every page canvas. Pale enough for long reading."
          large
        />
        <Swatch
          hex={tokens["--nav-bg"]}
          name="Structure"
          role="30% — sidebar, top bar, grid lines, all typography"
          usage="The anchor. Readable against the canvas."
          large
        />
        <Swatch
          hex={tokens["--cta"]}
          name="Accent"
          role="10% — primary action, badges, critical alerts"
          usage="Sparing. Never decorative, never more than one per view."
          large
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <Swatch
          hex={tokens["--surface"]}
          name="Surface"
          role="Cards, tables, drawers"
          usage="Keeps text maximally readable."
        />
        <Swatch
          hex={tokens["--surface-2"]}
          name="Surface 2"
          role="Panels, hover rows"
          usage="Deeper tint for grouped content."
        />
        <Swatch
          hex={tokens["--verified"]}
          name="Verified"
          role="Verified, unaltered, proven only"
          usage="Never used for anything else."
        />
        <Swatch
          hex={tokens["--high"]}
          name="High"
          role="High severity dot"
          usage="Severity is always a dot plus a word."
        />
        <Swatch
          hex={tokens["--medium"]}
          name="Medium"
          role="Medium severity dot"
          usage="Severity is always a dot plus a word."
        />
        <Swatch
          hex={tokens["--low"]}
          name="Low"
          role="Low severity dot"
          usage="Severity is always a dot plus a word."
        />
      </div>
    </>
  );
}
