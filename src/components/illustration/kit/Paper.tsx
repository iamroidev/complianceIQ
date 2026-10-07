import { Svg, shadowG, useLayerId } from "./shared";

type Props = {
  size?: number;
  folded?: boolean;
  lines?: number;
  highlight?: number;
};

export function Paper({ size, folded = false, lines = 4, highlight }: Props) {
  const sheetId = useLayerId("sheet");
  const foldId = useLayerId("fold");
  const lineYs = Array.from({ length: lines }, (_, i) => 46 + i * 14);

  return (
    <Svg w={96} h={112} size={size}>
      <g style={shadowG}>
        <path
          id={sheetId}
          fill="var(--ill-paper)"
          d={
            folded
              ? "M16 8 H62 L86 32 V98 A6 6 0 0 1 80 104 H16 A6 6 0 0 1 10 98 V14 A6 6 0 0 1 16 8 Z"
              : "M16 8 H80 A6 6 0 0 1 86 14 V98 A6 6 0 0 1 80 104 H16 A6 6 0 0 1 10 98 V14 A6 6 0 0 1 16 8 Z"
          }
        />
        {folded && (
          <path
            id={foldId}
            fill="var(--ill-cream)"
            d="M62 8 H86 V32 Z"
          />
        )}
      </g>
      {highlight != null && lineYs[highlight] != null && (
        <rect
          x={20}
          y={lineYs[highlight] - 7}
          width={56}
          height={12}
          rx={3}
          fill="var(--ill-ochre)"
          stroke="none"
        />
      )}
      {lineYs.map((y, i) => (
        <line
          key={i}
          x1={24}
          x2={i === lines - 1 && lines > 2 ? 54 : 72}
          y1={y}
          y2={y}
          stroke="var(--ill-ink)"
          strokeOpacity={0.35}
        />
      ))}
    </Svg>
  );
}
