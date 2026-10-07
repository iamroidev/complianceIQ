import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number };

export function Invoice({ size }: Props) {
  const sheetId = useLayerId("sheet");
  const amountId = useLayerId("amount");

  return (
    <Svg w={96} h={112} size={size}>
      <g style={shadowG}>
        <rect
          id={sheetId}
          x={10}
          y={8}
          width={76}
          height={96}
          rx={6}
          fill="var(--ill-paper)"
        />
      </g>
      <line x1={24} x2={72} y1={32} y2={32} strokeWidth={3} />
      <line x1={24} x2={72} y1={46} y2={46} strokeOpacity={0.35} />
      <line x1={24} x2={72} y1={58} y2={58} strokeOpacity={0.35} />
      <line x1={24} x2={58} y1={70} y2={70} strokeOpacity={0.35} />
      <g id={amountId}>
        <rect
          x={22}
          y={80}
          width={52}
          height={16}
          rx={4}
          fill="var(--ill-cream)"
        />
        <line x1={30} x2={66} y1={88} y2={88} strokeOpacity={0.55} />
      </g>
    </Svg>
  );
}
