import { Svg, shadowG } from "../kit/shared";
import { ChainLink, Paper, Seal } from "../kit";

type Props = { size?: number; tornAt?: number };

const SHEETS = [
  { label: "Alert", x: 96, y: 108, rot: -6 },
  { label: "Policy", x: 346, y: 96, rot: 3 },
  { label: "Evidence", x: 596, y: 108, rot: -3 },
] as const;

const LINK_X = [70, 200, 330, 460, 590, 720];

export function HeroCaseFile({ size, tornAt }: Props) {
  return (
    <Svg w={900} h={640} size={size}>
      <g style={shadowG}>
        <rect x={44} y={72} width={260} height={48} rx={14} fill="var(--ill-cream)" />
        <rect x={44} y={96} width={812} height={404} rx={16} fill="var(--ill-cream)" />
      </g>

      {SHEETS.map((s, i) => (
        <g
          key={s.label}
          transform={`translate(${s.x} ${s.y}) rotate(${s.rot} 95 111)`}
        >
          <g data-hero-sheet={i}>
          <Paper
            size={190}
            folded={i === 0}
            highlight={i === 1 ? 1 : i === 2 ? 2 : undefined}
          />
          <text
            x={48}
            y={68}
            fontSize={13}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--ill-ink)"
            fillOpacity={0.55}
            stroke="none"
          >
            {s.label}
          </text>
          <circle cx={95} cy={16} r={7} fill="var(--ill-ochre)" />
          {i === 2 && (
            <text
              x={54}
              y={149}
              fontSize={13}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="var(--ill-ink)"
              stroke="none"
            >
              USD 9,800.00
            </text>
          )}
          </g>
        </g>
      ))}

      <path
        id="hero-thread"
        d="M636 255 C 575 218 520 196 470 212 C 454 240 468 150 454 100"
        fill="none"
        stroke="var(--ill-teal)"
        strokeWidth={4}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
      />
      <circle cx={636} cy={255} r={7} fill="var(--ill-teal)" stroke="var(--ill-ink)" />

      <g transform="translate(418 30)">
        <g id="hero-seal">
          <Seal size={72} />
        </g>
      </g>

      <g style={shadowG}>
        <path
          fill="var(--ill-paper)"
          d="M44 316 H360 L392 344 H560 L592 316 H856 V484 A16 16 0 0 1 840 500 H60 A16 16 0 0 1 44 484 Z"
        />
      </g>

      <g id="hero-chain" data-torn={tornAt != null ? String(tornAt) : undefined}>
        {LINK_X.map((x, i) => (
          <g key={x} transform={`translate(${x} 512)`}>
            <g data-hero-link={i} className={tornAt === i ? "is-torn" : undefined}>
              <ChainLink
                size={150}
                torn={tornAt === i}
                critical={tornAt != null && i > tornAt}
              />
            </g>
          </g>
        ))}
      </g>
    </Svg>
  );
}
