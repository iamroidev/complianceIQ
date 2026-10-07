import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; torn?: boolean; critical?: boolean };

export function ChainLink({ size, torn = false, critical = false }: Props) {
  const leftId = useLayerId("left");
  const rightId = useLayerId("right");
  const fill = critical ? "var(--ill-terracotta)" : "var(--ill-paper)";

  return (
    <Svg w={120} h={64} size={size}>
      <g style={shadowG}>
        <rect
          id={leftId}
          x={8}
          y={16}
          width={52}
          height={32}
          rx={16}
          fill={fill}
        />
        {!torn && (
          <rect
            id={rightId}
            x={48}
            y={16}
            width={56}
            height={32}
            rx={16}
            fill={fill}
          />
        )}
        {torn && (
          <>
            <path
              id={rightId}
              fill={fill}
              d="M92 16 H80 A16 16 0 0 0 80 48 H92 Z"
            />
            <path
              fill={fill}
              d="M98 16 H104 A16 16 0 0 1 104 48 H98 Z"
            />
            <line x1={92} y1={18} x2={92} y2={46} stroke="var(--ill-terracotta)" />
            <line x1={98} y1={18} x2={98} y2={46} stroke="var(--ill-terracotta)" />
          </>
        )}
      </g>
    </Svg>
  );
}
