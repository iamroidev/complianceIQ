import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; found?: boolean };

export function Magnifier({ size, found = false }: Props) {
  const lensId = useLayerId("lens");

  return (
    <Svg w={80} h={80} size={size}>
      <g style={shadowG}>
        <line
          x1={47}
          y1={47}
          x2={65}
          y2={65}
          stroke="var(--ill-ink)"
          strokeWidth={9}
        />
        <circle
          id={lensId}
          cx={32}
          cy={32}
          r={22}
          fill="var(--ill-sky)"
        />
      </g>
      <path
        d="M20 24 A18 18 0 0 1 34 16"
        stroke="var(--ill-paper)"
        strokeWidth={3}
        fill="none"
        strokeOpacity={0.7}
      />
      {found && (
        <path
          d="M24 33 l6 6 l11 -13"
          stroke="var(--ill-teal)"
          strokeWidth={3.5}
          fill="none"
        />
      )}
    </Svg>
  );
}
