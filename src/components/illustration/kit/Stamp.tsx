import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number };

export function Stamp({ size }: Props) {
  const baseId = useLayerId("base");

  return (
    <Svg w={80} h={80} size={size}>
      <g style={shadowG}>
        <rect x={30} y={8} width={20} height={18} rx={9} fill="var(--ill-cream)" />
        <rect x={35} y={26} width={10} height={8} fill="var(--ill-paper)" />
        <path
          id={baseId}
          d="M25 34 H55 L60 58 H20 Z"
          fill="var(--ill-paper)"
        />
        <rect x={22} y={58} width={36} height={9} rx={3} fill="var(--ill-ochre)" />
      </g>
      <line x1={30} x2={50} y1={46} y2={46} strokeOpacity={0.35} />
    </Svg>
  );
}
