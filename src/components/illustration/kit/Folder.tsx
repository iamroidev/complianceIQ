import type { CSSProperties } from "react";
import { Svg, shadowG, rootStyle } from "./shared";
import { Seal } from "./Seal";

export interface FolderProps {
  title: string;
  count: number;
  critical?: boolean;
  dueSoon?: boolean;
  size?: number;
  width?: number;
  height?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * Case Folder (DESIGN §28.8, §29.3):
 * Cream paper folder with tab, thickness sheets (1-5) matching open alert count,
 * terracotta tab for critical, clock tag for due-soon, and a teal seal if zero alerts.
 */
export function Folder({
  title,
  count,
  critical = false,
  dueSoon = false,
  width = 180,
  height = 140,
  size,
  style,
  className,
}: FolderProps) {
  const w = width;
  const h = height;
  const actualW = size ?? w;
  const sheets = Math.min(Math.max(count, 0), 5);
  const tabColor = critical ? "var(--ill-terracotta)" : "var(--ill-cream)";
  const tabTextColor = critical ? "#ffffff" : "var(--ill-ink)";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: actualW,
        height: (actualW * h) / w,
        display: "inline-block",
        ...style,
      }}
      aria-label={`${title}, ${count} open${critical ? ", 1 critical" : ""}${dueSoon ? ", due soon" : ""}`}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={actualW}
        height={(actualW * h) / w}
        fill="none"
        style={rootStyle()}
      >
        {/* Back sheet thickness lines (1-5 sheets) */}
        {sheets >= 2 && (
          <rect
            x={10}
            y={24}
            width={w - 20}
            height={h - 32}
            rx={8}
            fill="var(--ill-cream)"
            stroke="var(--ill-ink)"
            strokeWidth="1.5"
            transform="rotate(-1.5 90 70)"
            opacity={0.8}
          />
        )}
        {sheets >= 3 && (
          <rect
            x={8}
            y={22}
            width={w - 18}
            height={h - 30}
            rx={8}
            fill="var(--ill-paper)"
            stroke="var(--ill-ink)"
            strokeWidth="1.5"
            transform="rotate(1.2 90 70)"
            opacity={0.9}
          />
        )}

        {/* Back folder tab */}
        <path
          d={`M 14 32 L 14 18 C 14 14, 18 10, 22 10 L 80 10 C 86 10, 92 14, 96 20 L 102 32 Z`}
          fill={tabColor}
          stroke="var(--ill-ink)"
          strokeWidth="1.5"
        />

        {/* Tab text or count */}
        <text
          x={52}
          y={23}
          textAnchor="middle"
          fill={tabTextColor}
          fontSize="11"
          fontWeight="600"
          fontFamily="var(--font-sans), sans-serif"
          stroke="none"
        >
          {critical ? "CRITICAL" : count > 0 ? `${count} OPEN` : "SEALED"}
        </text>

        {/* Main folder body */}
        <g style={shadowG}>
          <rect
            x={6}
            y={30}
            width={w - 12}
            height={h - 38}
            rx={10}
            fill="var(--ill-paper)"
            stroke="var(--ill-ink)"
            strokeWidth="1.5"
          />
        </g>

        {/* Folder label band */}
        <rect
          x={16}
          y={44}
          width={w - 32}
          height={28}
          rx={4}
          fill="var(--ill-cream)"
          stroke="var(--ill-ink)"
          strokeWidth="1"
        />
        <text
          x={24}
          y={62}
          fill="var(--ill-ink)"
          fontSize="11.5"
          fontWeight="600"
          fontFamily="var(--font-sans), sans-serif"
          stroke="none"
        >
          {title.length > 18 ? `${title.slice(0, 17)}…` : title}
        </text>

        {/* Interior lines representing case paperwork */}
        <line x1={20} y1={86} x2={w - 28} y2={86} stroke="var(--ill-ink)" strokeOpacity={0.25} strokeWidth="1.5" />
        <line x1={20} y1={98} x2={w - 44} y2={98} stroke="var(--ill-ink)" strokeOpacity={0.25} strokeWidth="1.5" />
        <line x1={20} y1={110} x2={w - 60} y2={110} stroke="var(--ill-ink)" strokeOpacity={0.25} strokeWidth="1.5" />

        {/* Status indicator: teal seal if 0 alerts, clock tag if due-soon */}
        {count === 0 ? (
          <g transform={`translate(${w - 48} ${h - 52})`}>
            <Seal size={36} />
          </g>
        ) : dueSoon ? (
          <g transform={`translate(${w - 40} ${h - 44})`}>
            <circle cx={14} cy={14} r={12} fill="var(--ill-ochre)" stroke="var(--ill-ink)" strokeWidth="1.5" />
            <polyline points="14,8 14,14 18,17" stroke="var(--ill-ink)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
