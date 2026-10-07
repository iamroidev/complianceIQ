import type { CSSProperties } from "react";
import { rootStyle, shadowG } from "./shared";

/**
 * Desk Lamp (DESIGN §28.4, §29.3):
 * Sits at the edge of the desk. Lamp shines when open alerts exist; turns off when all clear.
 */
export function DeskLamp({
  active = true,
  size = 120,
  style,
}: {
  active?: boolean;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 140 180"
      width={size}
      height={(size * 180) / 140}
      fill="none"
      style={{ ...rootStyle(), ...style }}
      aria-hidden="true"
    >
      {/* Light glow cone when active */}
      {active && (
        <path
          d="M 50 55 L 10 170 L 130 170 L 90 55 Z"
          fill="var(--ill-ochre)"
          opacity={0.12}
          stroke="none"
        />
      )}

      {/* Heavy round base */}
      <ellipse cx={70} cy={165} rx={36} ry={10} fill="var(--ill-cream)" stroke="var(--ill-ink)" strokeWidth="2" />
      <ellipse cx={70} cy={162} rx={28} ry={7} fill="var(--ill-paper)" stroke="var(--ill-ink)" strokeWidth="1.5" />

      {/* Articulated brass/ink arm */}
      <path
        d="M 70 162 C 70 130, 95 110, 85 80 C 80 65, 75 60, 70 54"
        stroke="var(--ill-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx={85} cy={80} r={4.5} fill="var(--ill-ochre)" stroke="var(--ill-ink)" strokeWidth="1.5" />
      <circle cx={70} cy={54} r={4} fill="var(--ill-ochre)" stroke="var(--ill-ink)" strokeWidth="1.5" />

      {/* Lamp shade */}
      <g style={shadowG}>
        <path
          d="M 50 56 C 50 36, 90 36, 90 56 L 100 70 L 40 70 Z"
          fill={active ? "var(--ill-teal)" : "var(--ill-cream)"}
          stroke="var(--ill-ink)"
          strokeWidth="2"
        />
        <ellipse cx={70} cy={70} rx={30} ry={7} fill={active ? "var(--ill-ochre)" : "var(--ill-paper)"} stroke="var(--ill-ink)" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/**
 * Desk Calendar (DESIGN §28.4, §29.3):
 * Shows today's date with a flag indicating the next regulatory deadline.
 */
export function DeskCalendar({
  day = 14,
  month = "MAR",
  flagDays = 4,
  size = 110,
  style,
}: {
  day?: number;
  month?: string;
  flagDays?: number;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      fill="none"
      style={{ ...rootStyle(), ...style }}
      aria-label={`Calendar: ${month} ${day}, next deadline in ${flagDays} days`}
    >
      {/* Wooden easel stand */}
      <path d="M 20 122 L 60 70 L 100 122" stroke="var(--ill-ink)" strokeWidth="2.5" />
      <line x1={26} y1={112} x2={94} y2={112} stroke="var(--ill-ink)" strokeWidth="2" />

      {/* Calendar back card */}
      <g style={shadowG}>
        <rect x={14} y={16} width={92} height={96} rx={8} fill="var(--ill-paper)" stroke="var(--ill-ink)" strokeWidth="2" />
      </g>

      {/* Top red binding strip */}
      <rect x={14} y={16} width={92} height={26} rx={6} fill="var(--ill-terracotta)" stroke="var(--ill-ink)" strokeWidth="2" />
      <circle cx={34} cy={22} r={3} fill="var(--ill-paper)" stroke="var(--ill-ink)" strokeWidth="1.5" />
      <circle cx={86} cy={22} r={3} fill="var(--ill-paper)" stroke="var(--ill-ink)" strokeWidth="1.5" />

      <text
        x={60}
        y={35}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="12"
        fontWeight="700"
        fontFamily="var(--font-sans), sans-serif"
        stroke="none"
      >
        {month}
      </text>

      {/* Large date number */}
      <text
        x={60}
        y={76}
        textAnchor="middle"
        fill="var(--ill-ink)"
        fontSize="34"
        fontWeight="800"
        fontFamily="var(--font-sans), sans-serif"
        stroke="none"
      >
        {day}
      </text>

      {/* Next deadline flag note */}
      <rect x={24} y={88} width={72} height={18} rx={4} fill="var(--ill-cream)" stroke="var(--ill-ink)" strokeWidth="1" />
      <text
        x={60}
        y={101}
        textAnchor="middle"
        fill="var(--ill-ink)"
        fontSize="9.5"
        fontWeight="600"
        fontFamily="var(--font-sans), sans-serif"
        stroke="none"
      >
        In {flagDays}d: First aid
      </text>
    </svg>
  );
}

/**
 * Paperclip (DESIGN §28.4, §29.3):
 * Terracotta for critical, ochre for high, steel/ink for normal.
 */
export function PaperClip({
  variant = "critical",
  size = 28,
  style,
}: {
  variant?: "critical" | "high" | "neutral";
  size?: number;
  style?: CSSProperties;
}) {
  const color =
    variant === "critical"
      ? "var(--ill-terracotta)"
      : variant === "high"
        ? "var(--ill-ochre)"
        : "var(--ill-ink)";

  return (
    <svg
      viewBox="0 0 24 44"
      width={size}
      height={(size * 44) / 24}
      fill="none"
      style={{ display: "block", ...style }}
      aria-hidden="true"
    >
      <path
        d="M 6 16 L 6 34 C 6 38, 18 38, 18 34 L 18 8 C 18 4, 10 4, 10 8 L 10 30 C 10 32, 14 32, 14 30 L 14 14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Potted desk plant for empty/all-clear state (§28.6, §29.22).
 */
export function DeskPlant({ size = 110 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      fill="none"
      style={rootStyle()}
      aria-hidden="true"
    >
      {/* Terracotta pot */}
      <polygon points="40,85 80,85 74,130 46,130" fill="var(--ill-terracotta)" stroke="var(--ill-ink)" strokeWidth="2" />
      <rect x={36} y={80} width={48} height={10} rx={3} fill="var(--ill-terracotta)" stroke="var(--ill-ink)" strokeWidth="2" />

      {/* Leaves */}
      <path d="M 60 80 Q 40 50 35 30 Q 55 45 60 75" fill="var(--ill-sage)" stroke="var(--ill-ink)" strokeWidth="1.5" />
      <path d="M 60 78 Q 75 40 85 24 Q 80 50 62 76" fill="var(--ill-teal)" stroke="var(--ill-ink)" strokeWidth="1.5" />
      <path d="M 60 76 Q 60 30 55 14 Q 70 34 62 74" fill="var(--ill-sage)" stroke="var(--ill-ink)" strokeWidth="1.5" />
    </svg>
  );
}
