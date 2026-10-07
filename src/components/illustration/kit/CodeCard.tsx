import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; leaking?: boolean };

export function CodeCard({ size, leaking = true }: Props) {
  const cardId = useLayerId("card");
  const keyId = useLayerId("key");

  return (
    <Svg w={128} h={96} size={size}>
      <g style={shadowG}>
        <rect
          id={cardId}
          x={8}
          y={14}
          width={88}
          height={68}
          rx={8}
          fill="var(--ill-ink)"
        />
      </g>
      <text
        x={24}
        y={62}
        fontSize={34}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="var(--ill-paper)"
        stroke="none"
      >
        {"{ }"}
      </text>
      {leaking && (
        <g id={keyId} transform="translate(84 38) scale(0.46)">
          <circle cx={22} cy={24} r={14} fill="var(--ill-ochre)" />
          <rect x={34} y={20} width={52} height={8} rx={4} fill="var(--ill-ochre)" />
          <rect x={68} y={28} width={7} height={11} rx={2} fill="var(--ill-ochre)" />
          <rect x={79} y={28} width={7} height={11} rx={2} fill="var(--ill-ochre)" />
          <circle cx={22} cy={24} r={5} fill="var(--ill-ink)" />
        </g>
      )}
    </Svg>
  );
}
