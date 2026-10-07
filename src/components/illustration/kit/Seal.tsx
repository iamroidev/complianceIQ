import { Svg, useLayerId } from "./shared";

type Props = { size?: number; variant?: "verified" | "broken" };

function scallopPath(cx: number, cy: number, outer: number, inner: number, bumps: number) {
  const steps = bumps * 2;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

const SEAL_PATH = scallopPath(32, 32, 27, 23, 12);

export function Seal({ size, variant = "verified" }: Props) {
  const sealId = useLayerId("seal");
  const checkId = useLayerId("check");
  const broken = variant === "broken";

  return (
    <Svg w={64} h={64} size={size}>
      <path
        id={sealId}
        d={SEAL_PATH}
        fill={broken ? "var(--ill-terracotta)" : "var(--ill-teal)"}
      />
      <circle
        cx={32}
        cy={32}
        r={15}
        fill="none"
        strokeOpacity={0.35}
      />
      {broken ? (
        <path
          d="M20 14 L33 27 L26 33 L45 50"
          stroke="var(--ill-paper)"
          strokeWidth={3.5}
          fill="none"
        />
      ) : (
        <path
          id={checkId}
          className="ill-seal-check"
          d="M24 33 l6 6 l11 -14"
          stroke="var(--ill-paper)"
          strokeWidth={3.5}
          fill="none"
          pathLength={1}
        />
      )}
    </Svg>
  );
}
