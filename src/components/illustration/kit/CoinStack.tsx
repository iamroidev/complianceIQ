import { Svg, shadowG, useLayerId } from "./shared";

type Props = { size?: number; count?: 3 | 4 | 5 };

export function CoinStack({ size, count = 4 }: Props) {
  const topId = useLayerId("top");
  const ys = Array.from({ length: count }, (_, i) => 60 - i * 11);

  return (
    <Svg w={96} h={72} size={size}>
      <g style={shadowG}>
        {ys.map((y, i) => (
          <ellipse
            key={y}
            cx={46}
            cy={y}
            rx={28}
            ry={9}
            fill="var(--ill-ochre)"
            id={i === count - 1 ? topId : undefined}
          />
        ))}
      </g>
      <ellipse
        cx={46}
        cy={ys[count - 1]}
        rx={15}
        ry={4.5}
        fill="none"
        strokeOpacity={0.4}
      />
    </Svg>
  );
}
