import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; leaking?: boolean };

export function Key({ size, leaking = false }: Props) {
  const bowId = useLayerId("bow");

  return (
    <Svg w={96} h={48} size={size}>
      <g
        style={shadowG}
        transform={leaking ? "translate(2 6)" : undefined}
      >
        <circle id={bowId} cx={22} cy={24} r={14} fill="var(--ill-ochre)" />
        <rect x={34} y={20} width={52} height={8} rx={4} fill="var(--ill-ochre)" />
        <rect x={68} y={28} width={7} height={11} rx={2} fill="var(--ill-ochre)" />
        <rect x={79} y={28} width={7} height={11} rx={2} fill="var(--ill-ochre)" />
      </g>
      <circle cx={22} cy={24} r={5} fill="var(--ill-paper)" />
    </Svg>
  );
}
