import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; verified?: boolean; expired?: boolean };

export function Certificate({ size, verified = true, expired = false }: Props) {
  const sheetId = useLayerId("sheet");
  const sealId = useLayerId("seal");

  return (
    <Svg w={112} h={96} size={size}>
      <g style={shadowG}>
        <rect
          id={sheetId}
          x={8}
          y={8}
          width={96}
          height={80}
          rx={6}
          fill="var(--ill-paper)"
        />
      </g>
      <rect
        x={16}
        y={16}
        width={80}
        height={64}
        rx={4}
        fill="none"
        strokeOpacity={0.4}
      />
      <line x1={30} x2={78} y1={36} y2={36} strokeOpacity={0.35} />
      <line x1={30} x2={66} y1={50} y2={50} strokeOpacity={0.35} />
      <line x1={30} x2={58} y1={64} y2={64} strokeOpacity={0.35} />
      {expired ? (
        <g id={sealId}>
          <path
            fill="var(--ill-terracotta)"
            d="M78 62 L76 84 L84 78 L92 84 L90 62 Z"
            strokeOpacity={0}
          />
          <circle cx={84} cy={62} r={11} fill="var(--ill-terracotta)" />
          <path
            d="M80 58 l8 8 M88 58 l-8 8"
            stroke="var(--ill-paper)"
            strokeWidth={2.5}
          />
          <rect x={6} y={64} width={54} height={18} rx={4} fill="var(--ill-terracotta)" />
          <text
            x={33}
            y={77}
            fontSize={10}
            fontWeight={700}
            fill="var(--ill-paper)"
            stroke="none"
            textAnchor="middle"
          >
            Expired
          </text>
        </g>
      ) : (
        verified && (
          <g id={sealId}>
            <path
              fill="var(--ill-teal)"
              d="M78 62 L76 84 L84 78 L92 84 L90 62 Z"
              strokeOpacity={0}
            />
            <circle cx={84} cy={62} r={11} fill="var(--ill-teal)" />
            <path
              d="M79 62 l4 4 l7 -8"
              stroke="var(--ill-paper)"
              strokeWidth={2.5}
            />
          </g>
        )
      )}
    </Svg>
  );
}
