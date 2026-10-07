import { Svg, shadowG } from "../kit/shared";
import { ChainLink, Magnifier, Paper, PaperStack, Seal, Thread } from "../kit";

type Props = { size?: number };

export function EmptyAlerts({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g style={shadowG}>
        <rect x={48} y={36} width={72} height={26} rx={10} fill="var(--ill-cream)" />
        <rect x={48} y={52} width={144} height={92} rx={10} fill="var(--ill-cream)" />
        <rect x={48} y={86} width={144} height={58} rx={10} fill="var(--ill-paper)" />
      </g>
      <line x1={66} x2={130} y1={104} y2={104} strokeOpacity={0.35} />
      <line x1={66} x2={116} y1={120} y2={120} strokeOpacity={0.35} />
      <g transform="translate(150 94)">
        <Seal size={46} />
      </g>
    </Svg>
  );
}

export function EmptyEvidence({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g transform="translate(44 26)">
        <PaperStack size={90} />
      </g>
      <g transform="translate(140 74)">
        <Seal size={56} />
      </g>
    </Svg>
  );
}

export function EmptyObligations({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g transform="translate(48 20)">
        <Paper size={96} folded />
      </g>
      <g transform="translate(140 62)">
        <Magnifier size={76} />
      </g>
    </Svg>
  );
}

export function EmptySearch({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g transform="translate(64 22)">
        <Magnifier size={112} />
      </g>
      <circle cx={188} cy={58} r={4} fill="var(--ill-ochre)" />
      <circle cx={200} cy={84} r={4} fill="var(--ill-ochre)" />
      <circle cx={188} cy={110} r={4} fill="var(--ill-ochre)" />
    </Svg>
  );
}

export function EmptyCoverageGap({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g transform="translate(20 48)">
        <Thread size={200} progress={0.45} ends={false} />
      </g>
      <line
        x1={122}
        y1={76}
        x2={138}
        y2={70}
        strokeOpacity={0.3}
        strokeDasharray="4 5"
      />
      <line
        x1={146}
        y1={67}
        x2={156}
        y2={63}
        strokeOpacity={0.3}
        strokeDasharray="4 5"
      />
    </Svg>
  );
}

export function ErrorDroppedLink({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g transform="translate(6 46)">
        <ChainLink size={104} />
      </g>
      <g transform="translate(126 46)">
        <ChainLink size={104} />
      </g>
      <g transform="translate(78 92) rotate(28 38 20)">
        <ChainLink size={76} critical />
      </g>
      <line x1={112} y1={52} x2={106} y2={42} stroke="var(--ill-terracotta)" strokeWidth={3} />
      <line x1={120} y1={52} x2={126} y2={42} stroke="var(--ill-terracotta)" strokeWidth={3} />
    </Svg>
  );
}

export function EmptyNotFound({ size }: Props) {
  return (
    <Svg w={240} h={160} size={size}>
      <g transform="translate(72 20)">
        <Paper size={100} folded lines={2} />
      </g>
      <text
        x={106}
        y={124}
        fontSize={48}
        fontWeight={700}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="var(--ill-ochre)"
        stroke="none"
      >
        ?
      </text>
    </Svg>
  );
}
