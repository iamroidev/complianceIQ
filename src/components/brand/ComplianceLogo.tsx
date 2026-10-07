import React from "react";

export type LogoVariant = "dark" | "light" | "seal" | "gold" | "monochrome";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface IconProps {
  size?: number | LogoSize;
  variant?: LogoVariant;
  className?: string;
  animate?: boolean;
}

interface LogoProps extends IconProps {
  showWordmark?: boolean;
  tagline?: boolean | string;
  href?: string;
}

const SIZE_MAP: Record<LogoSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

/**
 * ComplianceIcon — The Archival Signet & Audit Thread.
 *
 * Core Metaphor:
 * 1. The Notary Seal Disc: Double concentric perimeter with 4 cardinal registration pips
 *    (Spot, Explain, Decide, Prove).
 * 2. The Serif "C": Roman architectural crescent symbolizing Compliance & Authority.
 * 3. The "Q" & Verification Core: Nestled signet eyelet and diagonal ribbon tail that
 *    evokes both an intelligent magnifying loupe and the letter Q.
 * 4. The Archival Thread: Signature teal ribbon threading through the eyelet and anchoring
 *    the seal to the record.
 */
export function ComplianceIcon({
  size = "md",
  variant = "dark",
  className = "",
  animate = false,
}: IconProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] ?? 36;

  // Variant color definitions
  const isDark = variant === "dark";
  const isSeal = variant === "seal";
  const isGold = variant === "gold";
  const isMono = variant === "monochrome";

  // Base disc colors
  const discFill = isMono
    ? "currentColor"
    : isSeal
      ? "url(#ciq-seal-grad)"
      : isGold
        ? "#241D13"
        : isDark
          ? "#141E28"
          : "#FFFFFF";

  const discBorder = isMono
    ? "transparent"
    : isSeal
      ? "#8A2E2B"
      : isGold
        ? "#D97706"
        : isDark
          ? "rgba(255, 255, 255, 0.22)"
          : "#D5D7DA";

  // Archival inner border
  const innerRing = isMono
    ? "none"
    : isSeal
      ? "rgba(255, 255, 255, 0.35)"
      : isGold
        ? "rgba(217, 119, 6, 0.4)"
        : isDark
          ? "rgba(255, 255, 255, 0.16)"
          : "rgba(20, 30, 40, 0.12)";

  // Letter "C" stroke/fill
  const letterColor = isMono
    ? "#FFFFFF"
    : isSeal
      ? "#FFF9F2"
      : isGold
        ? "#FDE68A"
        : isDark
          ? "#F4F1EA"
          : "#14171A";

  // The Signature Thread
  const threadColor = isMono
    ? "currentColor"
    : isSeal
      ? "#EAB308"
      : isGold
        ? "#F59E0B"
        : "#0B5A4E"; // Archival deep teal

  // The Verification Pip (Golden eye / IQ core)
  const pipColor = isMono
    ? "currentColor"
    : isSeal
      ? "#FDE68A"
      : isGold
        ? "#F59E0B"
        : "#D97706"; // Warm notary ochre

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`compliance-icon ${animate ? "compliance-icon--animated" : ""} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Seal wax gradient */}
        <linearGradient id="ciq-seal-grad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9E322F" />
          <stop offset="1" stopColor="#73211F" />
        </linearGradient>

        {/* Subtle drop shadow for depth */}
        <filter id="ciq-shadow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.18" />
        </filter>

        {/* Gold leaf gradient */}
        <linearGradient id="ciq-gold-grad" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Outer Notary Seal Disc */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={discFill}
        stroke={discBorder}
        strokeWidth="1.25"
        filter={!isMono ? "url(#ciq-shadow)" : undefined}
      />

      {/* Concentric Milled / Perforated Inner Ring (Archival Notary Border) */}
      {!isMono && (
        <circle
          cx="24"
          cy="24"
          r="19"
          stroke={innerRing}
          strokeWidth="0.85"
          strokeDasharray="2 1.5"
        />
      )}

      {/* 4 Cardinal Registration Pips (Spot, Explain, Decide, Prove) */}
      {!isMono && (
        <>
          <circle cx="24" cy="5" r="1" fill={innerRing} />
          <circle cx="43" cy="24" r="1" fill={innerRing} />
          <circle cx="24" cy="43" r="1" fill={innerRing} />
          <circle cx="5" cy="24" r="1" fill={innerRing} />
        </>
      )}

      {/* The Signature Archival Thread (Weaves behind the C and anchors at the base) */}
      <path
        d="M 24 5 C 24 10, 27 15, 27 21 C 27 27, 22 31, 22 35 C 22 39, 25 43, 27 43"
        stroke={threadColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />

      {/* The Archival Ribbon Loop & Knot Tail (Forms the diagonal stem of the "Q") */}
      <path
        d="M 28 27 L 37 36 C 38 37, 36.5 39, 34.5 37.5 L 26 29"
        fill={threadColor}
        opacity="0.9"
      />
      <circle cx="35" cy="35" r="1.5" fill={pipColor} />

      {/* Classical Roman Serif Crescent "C" (Compliance) */}
      {/* Exquisitely drafted bezier curve with chisel bracketed terminals */}
      <path
        d="M 33.5 16.5 
           C 32 14, 29 11.5, 24 11.5 
           C 16.8 11.5, 12 17, 12 24 
           C 12 31, 16.8 36.5, 24 36.5 
           C 29.5 36.5, 32.5 33.5, 34 30.5
           L 30.8 29.5
           C 29.5 31.8, 27.2 33.2, 24 33.2
           C 18.8 33.2, 15.6 28.8, 15.6 24
           C 15.6 19.2, 18.8 14.8, 24 14.8
           C 27.2 14.8, 29.2 16.2, 30.6 18.2
           Z"
        fill={letterColor}
      />

      {/* Top Bracketed Serif Head on "C" */}
      <path
        d="M 31 13.5 L 35.5 15.5 L 32.5 18 Z"
        fill={letterColor}
      />

      {/* Central Tamper-Proof Verification Lens & Eyelet (The "IQ" Core) */}
      <circle
        cx="25"
        cy="23.5"
        r="3.5"
        fill={pipColor}
        stroke={isDark ? "#141E28" : "#FFFFFF"}
        strokeWidth="1"
      />
      <circle
        cx="25"
        cy="23.5"
        r="1.25"
        fill={isDark ? "#141E28" : "#FFFFFF"}
      />
    </svg>
  );
}

/**
 * ComplianceLogo — The Complete Brand Wordmark + Archival Mark.
 */
export function ComplianceLogo({
  size = "md",
  variant = "dark",
  showWordmark = true,
  tagline,
  href,
  className = "",
}: LogoProps) {
  const content = (
    <div
      className={`compliance-logo compliance-logo--${variant} compliance-logo--${size} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "xs" ? 7 : size === "sm" ? 9 : size === "lg" ? 14 : size === "xl" ? 16 : 11,
        textDecoration: "none",
        lineHeight: 1,
      }}
    >
      <ComplianceIcon size={size} variant={variant} />

      {showWordmark && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            className="compliance-logo__text"
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              letterSpacing: "-0.015em",
              fontWeight: 600,
            }}
          >
            <span
              className="compliance-logo__word"
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontSize:
                  size === "xs"
                    ? "16px"
                    : size === "sm"
                      ? "18px"
                      : size === "lg"
                        ? "28px"
                        : size === "xl"
                          ? "34px"
                          : "22px",
                color:
                  variant === "dark"
                    ? "var(--nav-text, #F4F1EA)"
                    : variant === "seal"
                      ? "#FFF9F2"
                      : "var(--text, #14171A)",
              }}
            >
              Compliance
            </span>
            <span
              className="compliance-logo__iq"
              style={{
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize:
                  size === "xs"
                    ? "14px"
                    : size === "sm"
                      ? "16px"
                      : size === "lg"
                        ? "24px"
                        : size === "xl"
                          ? "30px"
                          : "19px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginLeft: "1px",
                color:
                  variant === "dark" || variant === "seal"
                    ? "#E5A93C" // Warm notary ochre gold
                    : "#B45309", // Deep ochre amber on light
              }}
            >
              IQ
            </span>
          </div>

          {tagline && (
            <span
              className="compliance-logo__tagline"
              style={{
                fontSize: size === "lg" || size === "xl" ? "12px" : "10px",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontWeight: 500,
                letterSpacing: "0.02em",
                color:
                  variant === "dark"
                    ? "rgba(244, 241, 234, 0.7)"
                    : "var(--text-2, #43484E)",
              }}
            >
              {typeof tagline === "string" ? tagline : "Automated Compliance & Audit"}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none", color: "inherit" }} aria-label="ComplianceIQ Home">
        {content}
      </a>
    );
  }

  return content;
}
