import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; expired?: boolean; today?: number };

const DOTS = Array.from({ length: 12 }, (_, i) => ({
  x: 24 + (i % 4) * 16,
  y: 50 + Math.floor(i / 4) * 16,
}));

export function Calendar({ size, expired = false, today = 4 }: Props) {
  const bodyId = useLayerId("body");
  const headerId = useLayerId("header");
  const todayId = useLayerId("today");

  return (
    <Svg w={96} h={96} size={size}>
      <g style={shadowG}>
        <rect
          id={bodyId}
          x={8}
          y={18}
          width={80}
          height={70}
          rx={6}
          fill="var(--ill-paper)"
        />
        <path
          id={headerId}
          fill={expired ? "var(--ill-terracotta)" : "var(--ill-sky)"}
          d="M14 18 H82 A6 6 0 0 1 88 24 V34 H8 V24 A6 6 0 0 1 14 18 Z"
        />
      </g>
      <circle cx={30} cy={13} r={4} fill="var(--ill-paper)" />
      <circle cx={66} cy={13} r={4} fill="var(--ill-paper)" />
      {DOTS.map((d, i) =>
        i === today ? (
          <circle
            key={i}
            id={todayId}
            cx={d.x}
            cy={d.y}
            r={5}
            fill={
              expired ? "var(--ill-terracotta)" : "var(--ill-teal)"
            }
          />
        ) : (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={3.5}
            fill="var(--ill-ink)"
            fillOpacity={0.25}
            stroke="none"
          />
        ),
      )}
    </Svg>
  );
}
