import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; sheets?: 2 | 3 };

export function PaperStack({ size, sheets = 3 }: Props) {
  const backId = useLayerId("back");
  const midId = useLayerId("mid");
  const frontId = useLayerId("front");

  return (
    <Svg w={96} h={112} size={size}>
      <g style={shadowG}>
        <rect
          id={backId}
          x={20}
          y={20}
          width={66}
          height={84}
          rx={6}
          fill="var(--ill-cream)"
        />
        {sheets === 3 && (
          <rect
            id={midId}
            x={15}
            y={14}
            width={71}
            height={90}
            rx={6}
            fill="var(--ill-paper)"
            opacity={0.75}
          />
        )}
        <rect
          id={frontId}
          x={10}
          y={8}
          width={76}
          height={96}
          rx={6}
          fill="var(--ill-paper)"
        />
      </g>
      {[40, 54, 68, 82].map((y) => (
        <line
          key={y}
          x1={24}
          x2={72}
          y1={y}
          y2={y}
          stroke="var(--ill-ink)"
          strokeOpacity={0.35}
        />
      ))}
    </Svg>
  );
}
