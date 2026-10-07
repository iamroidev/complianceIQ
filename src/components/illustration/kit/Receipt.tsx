import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; torn?: boolean };

export function Receipt({ size, torn = false }: Props) {
  const sheetId = useLayerId("sheet");

  return (
    <Svg w={72} h={112} size={size}>
      <g style={shadowG}>
        <path
          id={sheetId}
          fill="var(--ill-paper)"
          d="M12 8 H60 V92 L54 98 L48 92 L42 98 L36 92 L30 98 L24 92 L18 98 L12 92 Z"
        />
      </g>
      <line x1={20} x2={52} y1={26} y2={26} strokeOpacity={0.35} />
      <line x1={20} x2={52} y1={38} y2={38} strokeOpacity={0.35} />
      <line x1={20} x2={44} y1={50} y2={50} strokeOpacity={0.35} />
      <rect x={18} y={62} width={36} height={14} rx={3} fill="var(--ill-ochre)" stroke="none" />
      <line x1={20} x2={52} y1={69} y2={69} strokeOpacity={0.6} />
      <line x1={20} x2={38} y1={84} y2={84} strokeOpacity={0.35} />
      {torn && (
        <path
          d="M36 8 V96"
          stroke="var(--ill-terracotta)"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      )}
    </Svg>
  );
}
