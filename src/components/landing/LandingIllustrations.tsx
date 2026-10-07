import React from "react";

/**
 * StatementIllustration1 — "Turn your policies into checks"
 * A crisp archival policy document with highlighted obligation text,
 * a brass paperclip, and a teal thread connecting to an active check tag.
 */
export function PolicyObligationIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="lp-statement-art"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="stmt1-shadow" x="0" y="0" width="200" height="150" filterUnits="userSpaceOnUse">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#0F1722" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Background document shadow & sheet */}
      <rect x="25" y="15" width="115" height="120" rx="4" fill="#F4F1EA" stroke="#E2DFD8" strokeWidth="1" filter="url(#stmt1-shadow)" />
      
      {/* Policy Header Bar */}
      <rect x="35" y="25" width="45" height="6" rx="2" fill="#141E28" opacity="0.8" />
      <rect x="85" y="27" width="24" height="3" rx="1.5" fill="#A8A29E" />

      {/* Prose lines */}
      <rect x="35" y="38" width="95" height="3" rx="1.5" fill="#D6D3D1" />
      <rect x="35" y="46" width="90" height="3" rx="1.5" fill="#D6D3D1" />
      
      {/* Highlighted Obligation Span (§30.3 mark with ochre background) */}
      <rect x="35" y="55" width="95" height="16" rx="2" fill="#FDE68A" fillOpacity="0.45" />
      <line x1="35" y1="71" x2="130" y2="71" stroke="#D97706" strokeWidth="1.5" />
      <text x="38" y="66" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fontWeight="600" fill="#8A5200">
        &ldquo;...must verify within 48h...&rdquo;
      </text>

      {/* Further prose lines */}
      <rect x="35" y="78" width="85" height="3" rx="1.5" fill="#E7E5E4" />
      <rect x="35" y="86" width="92" height="3" rx="1.5" fill="#E7E5E4" />
      <rect x="35" y="94" width="70" height="3" rx="1.5" fill="#E7E5E4" />

      {/* Brass Paperclip at top-left */}
      <path
        d="M 40 10 L 40 28 C 40 32, 48 32, 48 28 L 48 14 C 48 9, 36 9, 36 14 L 36 32"
        stroke="#D97706"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />

      {/* Teal Archival Thread flowing from the highlighted span to the rule tag */}
      <path
        d="M 130 63 C 148 63, 138 90, 152 94"
        stroke="#0B5A4E"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="100"
        className="lp-anim-thread"
      />

      {/* Connected Rule Tag */}
      <g transform="translate(136, 82)">
        <rect x="0" y="0" width="56" height="28" rx="3" fill="#FFFFFF" stroke="#0B5A4E" strokeWidth="1.25" filter="url(#stmt1-shadow)" />
        <circle cx="8" cy="14" r="3" fill="#0B5A4E" />
        <path d="M 6.5 14 L 7.5 15.5 L 9.5 12.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <text x="15" y="12" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fontWeight="700" fill="#0B5A4E">
          CHECKED
        </text>
        <text x="15" y="21" fontFamily="var(--font-geist-sans), sans-serif" fontSize="5.5" fontWeight="500" fill="#43484E">
          Every 60m
        </text>
      </g>
    </svg>
  );
}

/**
 * StatementIllustration2 — "See why every alert fired"
 * An authentic case briefing slip with a highlighted quotation,
 * a terracotta "CRITICAL" wax stamp, and an archival magnifying lens.
 */
export function AlertBriefingIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="lp-statement-art"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="stmt2-shadow" x="0" y="0" width="200" height="150" filterUnits="userSpaceOnUse">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#0F1722" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Case Briefing Slip */}
      <rect x="20" y="16" width="125" height="118" rx="3" fill="#FAF8F5" stroke="#E2DFD8" strokeWidth="1" filter="url(#stmt2-shadow)" />

      {/* Header with Case ID and Severity Stamp */}
      <text x="30" y="32" fontFamily="var(--font-geist-mono), monospace" fontSize="7" fontWeight="600" fill="#78716C">
        CASE-2026-0812
      </text>

      {/* Terracotta Urgency Stamp */}
      <g transform="translate(96, 22) rotate(-5)">
        <rect x="0" y="0" width="42" height="14" rx="2" fill="#FEE2E2" stroke="#A12A2A" strokeWidth="1" />
        <text x="6" y="10" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fontWeight="700" fill="#A12A2A" letterSpacing="0.5">
          HIGH RISK
        </text>
      </g>

      {/* Plain sentence summary */}
      <text x="30" y="48" fontFamily="var(--font-newsreader), Georgia, serif" fontSize="8.5" fontWeight="600" fill="#14171A">
        Two deposits within 48h
      </text>

      {/* Evidence table lines */}
      <rect x="30" y="58" width="105" height="1" fill="#E7E5E4" />
      <text x="30" y="69" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fill="#43484E">
        Deposit A: <tspan fontWeight="700" fill="#14171A">USD 9,800.00</tspan>
      </text>
      <text x="30" y="79" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fill="#43484E">
        Deposit B: <tspan fontWeight="700" fill="#14171A">USD 9,850.00</tspan>
      </text>
      <rect x="30" y="85" width="105" height="1" fill="#E7E5E4" />

      {/* Quotation callout box */}
      <rect x="30" y="91" width="105" height="26" rx="2" fill="#F5F5F4" stroke="#D6D3D1" strokeWidth="0.75" />
      <text x="36" y="101" fontFamily="var(--font-newsreader), serif" fontStyle="italic" fontSize="6.5" fill="#43484E">
        &ldquo;31 CFR § 1020.320: Multiple
      </text>
      <text x="36" y="110" fontFamily="var(--font-newsreader), serif" fontStyle="italic" fontSize="6.5" fill="#43484E">
        transactions just under USD 10,000.&rdquo;
      </text>

      {/* Archival Brass Magnifying Loupe focusing on the figure */}
      <g transform="translate(112, 56) rotate(18)">
        {/* Handle */}
        <rect x="34" y="18" width="22" height="5" rx="2" fill="#D97706" stroke="#92400E" strokeWidth="0.75" />
        <rect x="36" y="19" width="18" height="3" rx="1" fill="#F59E0B" />
        {/* Brass Lens Rim */}
        <circle cx="20" cy="20" r="16" fill="rgba(255, 255, 255, 0.4)" stroke="#B45309" strokeWidth="2.5" />
        {/* Inner Glare Arc */}
        <path d="M 10 14 C 14 8, 26 8, 30 14" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        {/* Target Focal Crosshairs */}
        <line x1="20" y1="12" x2="20" y2="15" stroke="#0B5A4E" strokeWidth="1" />
        <line x1="20" y1="25" x2="20" y2="28" stroke="#0B5A4E" strokeWidth="1" />
        <line x1="12" y1="20" x2="15" y2="20" stroke="#0B5A4E" strokeWidth="1" />
        <line x1="25" y1="20" x2="28" y2="20" stroke="#0B5A4E" strokeWidth="1" />
      </g>
    </svg>
  );
}

/**
 * StatementIllustration3 — "Hand auditors a report they can verify"
 * Three interlocking archival paper chain links, joined with brass eyelets
 * and stamped with the emerald/teal notary seal of verification.
 */
export function AuditChainIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="lp-statement-art"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="stmt3-shadow" x="0" y="0" width="200" height="150" filterUnits="userSpaceOnUse">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#0F1722" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Cryptographic Hash Chain: Three Interlocking Paper Chain Links */}
      {/* Link 1 (Left) */}
      <g transform="translate(18, 52)">
        <rect x="0" y="0" width="46" height="34" rx="17" fill="#F4F1EA" stroke="#D6D3D1" strokeWidth="1.5" filter="url(#stmt3-shadow)" />
        <rect x="10" y="9" width="26" height="16" rx="8" fill="#FFFFFF" stroke="#E2DFD8" strokeWidth="1" />
        <text x="14" y="20" fontFamily="var(--font-geist-mono), monospace" fontSize="5.5" fontWeight="600" fill="#78716C">
          #1283
        </text>
      </g>

      {/* Connecting Archival Thread through Links */}
      <path
        d="M 10 69 L 190 69"
        stroke="#0B5A4E"
        strokeWidth="2"
        strokeDasharray="4 2"
        opacity="0.85"
      />

      {/* Link 2 (Center - Prominent) */}
      <g transform="translate(56, 44)">
        <rect x="0" y="0" width="56" height="42" rx="21" fill="#FFFFFF" stroke="#0B5A4E" strokeWidth="2" filter="url(#stmt3-shadow)" />
        <rect x="13" y="11" width="30" height="20" rx="10" fill="#FAF8F5" stroke="#0B5A4E" strokeWidth="1" />
        <text x="19" y="24" fontFamily="var(--font-geist-mono), monospace" fontSize="6.5" fontWeight="700" fill="#0B5A4E">
          #1284
        </text>
        {/* Brass Rivet / Eyelet */}
        <circle cx="8" cy="21" r="2.5" fill="#D97706" stroke="#92400E" strokeWidth="0.75" />
        <circle cx="48" cy="21" r="2.5" fill="#D97706" stroke="#92400E" strokeWidth="0.75" />
      </g>

      {/* Link 3 (Right) */}
      <g transform="translate(104, 52)">
        <rect x="0" y="0" width="46" height="34" rx="17" fill="#F4F1EA" stroke="#D6D3D1" strokeWidth="1.5" filter="url(#stmt3-shadow)" />
        <rect x="10" y="9" width="26" height="16" rx="8" fill="#FFFFFF" stroke="#E2DFD8" strokeWidth="1" />
        <text x="14" y="20" fontFamily="var(--font-geist-mono), monospace" fontSize="5.5" fontWeight="600" fill="#78716C">
          #1285
        </text>
      </g>

      {/* Official Stamped Archival Notary Seal on Top */}
      <g transform="translate(135, 20)">
        {/* Seal Disc */}
        <circle cx="28" cy="28" r="24" fill="#0B5A4E" stroke="#083E36" strokeWidth="1.5" filter="url(#stmt3-shadow)" />
        {/* Concentric Milled Perforations */}
        <circle cx="28" cy="28" r="20" stroke="#5EEAD4" strokeWidth="0.75" strokeDasharray="2 1.5" />
        {/* Verified Ribbon Tails */}
        <path d="M 22 48 L 16 66 L 24 62 L 28 66 L 28 50" fill="#083E36" />
        <path d="M 34 48 L 40 66 L 32 62 L 28 66 L 28 50" fill="#0B5A4E" />
        {/* Center Verified Tick */}
        <path d="M 20 28 L 26 34 L 37 21" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Outer Curved Seal Text */}
        <text x="28" y="14" fontFamily="var(--font-geist-sans), sans-serif" fontSize="4.5" fontWeight="700" fill="#5EEAD4" textAnchor="middle" letterSpacing="0.8">
          IMMUTABLE LEDGER
        </text>
        <text x="28" y="43" fontFamily="var(--font-geist-sans), sans-serif" fontSize="4.5" fontWeight="700" fill="#5EEAD4" textAnchor="middle" letterSpacing="0.8">
          SHA-256 PROVEN
        </text>
      </g>
    </svg>
  );
}

/**
 * HumanGatekeeperIllustration — The "People stay in charge" Guardrail Scene.
 * Visualizes deterministic rules and guarded AI advice converging into
 * a strict Verification Gate before reaching the Compliance Officer.
 */
export function HumanGatekeeperIllustration({ size = 520 }: { size?: number }) {
  return (
    <svg
      width="100%"
      height={Math.round(size * 0.45)}
      viewBox="0 0 640 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="lp-human-gate-scene"
      aria-hidden="true"
      focusable="false"
      style={{ maxWidth: "640px", margin: "28px auto 0", display: "block" }}
    >
      <defs>
        <filter id="gate-shadow" x="0" y="0" width="640" height="280" filterUnits="userSpaceOnUse">
          <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#0F1722" floodOpacity="0.09" />
        </filter>
        <linearGradient id="gate-beam" x1="280" y1="70" x2="360" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B5A4E" stopOpacity="0.15" />
          <stop offset="1" stopColor="#0B5A4E" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Background Frame / Desk Mat */}
      <rect x="20" y="15" width="600" height="250" rx="8" fill="#FAF8F5" stroke="#E2DFD8" strokeWidth="1.25" filter="url(#gate-shadow)" />

      {/* LANE 1 (Left - Top): Deterministic Rules Engine */}
      <g transform="translate(45, 45)">
        <rect x="0" y="0" width="165" height="85" rx="5" fill="#FFFFFF" stroke="#0B5A4E" strokeWidth="1.5" />
        <rect x="12" y="12" width="6" height="6" rx="1" fill="#0B5A4E" />
        <text x="24" y="18" fontFamily="var(--font-geist-sans), sans-serif" fontSize="9.5" fontWeight="700" fill="#0B5A4E">
          RULES DECIDE
        </text>
        <text x="12" y="34" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#43484E">
          • Risk score calculated
        </text>
        <text x="12" y="47" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#43484E">
          • SLA deadline stamped
        </text>
        <text x="12" y="60" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#43484E">
          • Audit record appended
        </text>
        <rect x="12" y="68" width="68" height="10" rx="2" fill="#E6F4F1" />
        <text x="16" y="76" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fontWeight="600" fill="#0B5A4E">
          Rules never guess
        </text>
      </g>

      {/* LANE 2 (Left - Bottom): Guarded AI Assistant */}
      <g transform="translate(45, 150)">
        <rect x="0" y="0" width="165" height="85" rx="5" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.5" />
        <circle cx="15" cy="15" r="4" fill="#D97706" />
        <text x="24" y="18" fontFamily="var(--font-geist-sans), sans-serif" fontSize="9.5" fontWeight="700" fill="#8A5200">
          AI SUGGESTS
        </text>
        <text x="12" y="34" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#43484E">
          • Drafts explanation in plain words
        </text>
        <text x="12" y="47" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#43484E">
          • Highlights policy clauses
        </text>
        <text x="12" y="60" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#43484E">
          • Never assigns risk or closes alerts
        </text>
        <rect x="12" y="68" width="76" height="10" rx="2" fill="#FEF3C7" />
        <text x="16" y="76" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fontWeight="600" fill="#8A5200">
          Marked &ldquo;AI-assisted&rdquo;
        </text>
      </g>

      {/* FLOWING CONVERGENCE THREADS */}
      <path
        d="M 210 88 C 245 88, 255 125, 280 135"
        stroke="#0B5A4E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 210 192 C 245 192, 255 155, 280 145"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* CENTERPIECE: The Citation & Evidence Verification Gate */}
      <g transform="translate(280, 85)">
        <rect x="0" y="0" width="135" height="110" rx="6" fill="#141E28" stroke="#0B5A4E" strokeWidth="2" filter="url(#gate-shadow)" />
        {/* Brass Header Badge */}
        <rect x="14" y="12" width="107" height="18" rx="3" fill="#0B5A4E" />
        <text x="67" y="24" fontFamily="var(--font-geist-sans), sans-serif" fontSize="8" fontWeight="700" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.4">
          SOURCE CHECK GATE
        </text>
        {/* Verification Checkpoint Items */}
        <text x="16" y="46" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#F4F1EA">
          ✓ Numbers match evidence
        </text>
        <text x="16" y="62" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#F4F1EA">
          ✓ Policy quotation verified
        </text>
        <text x="16" y="78" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fill="#F4F1EA">
          ✓ Source link unbroken
        </text>
        <line x1="16" y1="86" x2="119" y2="86" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x="67" y="98" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6.5" fontWeight="600" fill="#5EEAD4" textAnchor="middle">
          CANNOT HALLUCINATE PAST GATE
        </text>
      </g>

      {/* OUTPUT THREAD TO OFFICER */}
      <path
        d="M 415 140 L 460 140"
        stroke="#0B5A4E"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* FINAL DESTINATION: The Compliance Officer's Review Tray */}
      <g transform="translate(460, 50)">
        <rect x="0" y="0" width="145" height="180" rx="6" fill="#FFFFFF" stroke="#141E28" strokeWidth="1.5" filter="url(#gate-shadow)" />
        {/* Officer Avatar / Badge */}
        <circle cx="28" cy="28" r="14" fill="#141E28" />
        <path d="M 23 26 C 23 23, 26 21, 28 21 C 30 21, 33 23, 33 26 C 33 29, 30 30, 28 30 C 26 30, 23 29, 23 26 Z" fill="#FAF8F5" />
        <path d="M 18 38 C 18 34, 22 33, 28 33 C 34 33, 38 34, 38 38" stroke="#FAF8F5" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <text x="48" y="26" fontFamily="var(--font-geist-sans), sans-serif" fontSize="9" fontWeight="700" fill="#141E28">
          YOU DECIDE
        </text>
        <text x="48" y="37" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7" fill="#78716C">
          Compliance Officer
        </text>

        {/* Action Tray */}
        <rect x="14" y="54" width="117" height="1" fill="#E2DFD8" />
        <text x="14" y="70" fontFamily="var(--font-newsreader), Georgia, serif" fontSize="8.5" fontWeight="600" fill="#14171A">
          &ldquo;Review & Sign&rdquo;
        </text>
        <rect x="14" y="80" width="117" height="24" rx="3" fill="#141E28" />
        <text x="72" y="95" fontFamily="var(--font-geist-sans), sans-serif" fontSize="8" fontWeight="600" fill="#FFFFFF" textAnchor="middle">
          File official report
        </text>

        <rect x="14" y="112" width="117" height="22" rx="3" fill="#FAF8F5" stroke="#D6D3D1" strokeWidth="1" />
        <text x="72" y="126" fontFamily="var(--font-geist-sans), sans-serif" fontSize="7.5" fontWeight="600" fill="#43484E" textAnchor="middle">
          Escalate / Dismiss
        </text>

        {/* Permanent Stamp Marker */}
        <rect x="14" y="146" width="117" height="22" rx="2" fill="#E6F4F1" stroke="#0B5A4E" strokeWidth="0.75" />
        <text x="72" y="160" fontFamily="var(--font-geist-mono), monospace" fontSize="6" fontWeight="700" fill="#0B5A4E" textAnchor="middle">
          SAVED TO AUDIT RECORD
        </text>
      </g>
    </svg>
  );
}

/**
 * DossierClosingHero — The Archival Case Dossier Ready for Audit.
 * Imposing, tactile archival case folder tied with ribbon and sealed with wax.
 */
export function DossierClosingHero({ size = 320 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.72)}
      viewBox="0 0 320 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="lp-dossier-hero"
      aria-hidden="true"
      focusable="false"
      style={{ margin: "0 auto 28px", display: "block" }}
    >
      <defs>
        <filter id="dossier-shadow" x="0" y="0" width="320" height="230" filterUnits="userSpaceOnUse">
          <feDropShadow dx="3" dy="8" stdDeviation="6" floodColor="#0F1722" floodOpacity="0.12" />
        </filter>
        <linearGradient id="folder-grad" x1="40" y1="20" x2="280" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5EFE6" />
          <stop offset="1" stopColor="#E6DC CE" />
        </linearGradient>
      </defs>

      {/* Back Folder Flap */}
      <path
        d="M 40 30 L 120 30 L 135 44 L 280 44 C 285 44, 288 47, 288 52 L 288 195 C 288 200, 285 204, 280 204 L 40 204 C 35 204, 32 200, 32 195 L 32 38 C 32 33, 35 30, 40 30 Z"
        fill="#DDD3C3"
        stroke="#C9BEAC"
        strokeWidth="1.25"
      />

      {/* Internal Document Pages Fan Out */}
      <rect x="48" y="24" width="220" height="170" rx="3" fill="#FAF8F5" stroke="#E2DFD8" strokeWidth="1" transform="rotate(-2 48 24)" />
      <rect x="52" y="28" width="220" height="170" rx="3" fill="#FFFFFF" stroke="#E2DFD8" strokeWidth="1" transform="rotate(1.5 52 28)" />

      {/* Main Front Folder Body */}
      <rect
        x="36"
        y="46"
        width="248"
        height="156"
        rx="5"
        fill="#EFE8DC"
        stroke="#D5CABB"
        strokeWidth="1.5"
        filter="url(#dossier-shadow)"
      />

      {/* Official Archival Case Room Label */}
      <g transform="translate(60, 68)">
        <rect x="0" y="0" width="135" height="54" rx="3" fill="#FFFFFF" stroke="#D5CABB" strokeWidth="1" />
        <line x1="12" y1="12" x2="55" y2="12" stroke="#141E28" strokeWidth="2" />
        <text x="12" y="26" fontFamily="var(--font-newsreader), Georgia, serif" fontSize="11" fontWeight="700" fill="#14171A">
          AUDIT DOSSIER
        </text>
        <text x="12" y="38" fontFamily="var(--font-geist-mono), monospace" fontSize="6.5" fill="#78716C">
          VERIFIED RECORD PACK · 2026
        </text>
        <text x="12" y="46" fontFamily="var(--font-geist-sans), sans-serif" fontSize="6" fontWeight="600" fill="#0B5A4E">
          38 Obligations · 0 Alterations
        </text>
      </g>

      {/* Archival Binding Ribbon / Teal Thread Strap */}
      <rect x="210" y="46" width="16" height="156" fill="#0B5A4E" opacity="0.9" />
      <line x1="210" y1="46" x2="210" y2="202" stroke="#083E36" strokeWidth="1" />
      <line x1="226" y1="46" x2="226" y2="202" stroke="#083E36" strokeWidth="1" />

      {/* Hanging Bookmark / Tape */}
      <path d="M 210 202 L 218 222 L 226 202 Z" fill="#0B5A4E" />

      {/* Imposing Crimson Notary Wax Seal */}
      <g transform="translate(196, 110)">
        {/* Wax base with scalloped edge */}
        <circle cx="22" cy="22" r="22" fill="#9E322F" filter="url(#dossier-shadow)" />
        <circle cx="22" cy="22" r="19" fill="#872624" stroke="#681917" strokeWidth="1" />
        <circle cx="22" cy="22" r="16" stroke="#DCA2A0" strokeWidth="0.85" strokeDasharray="2 1.5" />
        
        {/* Monogram / Proof Hallmark */}
        <path
          d="M 28 17 C 27 15, 24 13.5, 21 13.5 C 16 13.5, 13 17, 13 22 C 13 27, 16 30.5, 21 30.5 C 24 30.5, 26 29, 27 27 L 24.5 26.5 C 23.8 27.8, 22.5 28.5, 21 28.5 C 17.5 28.5, 15.5 25.5, 15.5 22 C 15.5 18.5, 17.5 15.5, 21 15.5 C 22.5 15.5, 23.8 16.2, 24.5 17.5 Z"
          fill="#FFF9F2"
        />
        <circle cx="22" cy="21.5" r="2" fill="#FDE68A" />
      </g>
    </svg>
  );
}
