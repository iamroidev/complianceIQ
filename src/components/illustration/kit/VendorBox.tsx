import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; missing?: boolean };

export function VendorBox({ size, missing = false }: Props) {
  const boxId = useLayerId("box");
  const labelId = useLayerId("label");

  return (
    <Svg w={96} h={96} size={size}>
      {missing && (
        <g>
          <rect
            x={24}
            y={6}
            width={44}
            height={36}
            rx={4}
            fill="var(--ill-paper)"
            stroke="var(--ill-terracotta)"
            strokeDasharray="6 5"
          />
          <text
            x={46}
            y={28}
            fontSize={18}
            fontWeight={700}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--ill-terracotta)"
            stroke="none"
            textAnchor="middle"
          >
            ?
          </text>
        </g>
      )}
      <g style={shadowG}>
        <rect
          id={boxId}
          x={12}
          y={38}
          width={72}
          height={46}
          rx={6}
          fill="var(--ill-cream)"
        />
        <rect
          x={12}
          y={30}
          width={72}
          height={14}
          rx={5}
          fill="var(--ill-paper)"
        />
        <rect
          x={41}
          y={30}
          width={14}
          height={54}
          fill="var(--ill-ochre)"
        />
      </g>
      <g id={labelId}>
        <rect
          x={56}
          y={56}
          width={24}
          height={18}
          rx={3}
          fill="var(--ill-paper)"
        />
        <line x1={60} x2={76} y1={63} y2={63} strokeOpacity={0.45} />
        <line x1={60} x2={72} y1={69} y2={69} strokeOpacity={0.45} />
      </g>
    </Svg>
  );
}
