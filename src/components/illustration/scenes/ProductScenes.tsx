import { Svg, shadowG } from "../kit/shared";
import { Paper, Seal, Thread } from "../kit";

type Props = { size?: number };

export function PolicyToChecks({ size }: Props) {
  return (
    <Svg w={560} h={320} size={size}>
      <g transform="translate(40 44)">
        <Paper size={170} highlight={1} />
      </g>
      <g id="ptc-strip">
        <rect x={75} y={137} width={100} height={22} rx={4} fill="var(--ill-ochre)" />
        <line x1={82} x2={166} y1={144} y2={144} strokeOpacity={0.5} />
        <line x1={82} x2={128} y1={152} y2={152} strokeOpacity={0.5} />
      </g>
      <g transform="translate(210 62)">
        <Thread id="ptc-thread" size={180} />
      </g>
      <g id="ptc-card">
        <g style={shadowG}>
          <rect
            x={380}
            y={100}
            width={144}
            height={96}
            rx={8}
            fill="var(--ill-paper)"
          />
        </g>
        <g>
          <rect x={400} y={120} width={44} height={24} rx={12} fill="var(--ill-teal)" />
          <circle cx={432} cy={132} r={9} fill="var(--ill-paper)" />
          <line x1={400} x2={504} y1={164} y2={164} strokeOpacity={0.35} />
          <line x1={400} x2={480} y1={180} y2={180} strokeOpacity={0.35} />
          <rect x={400} y={186} width={104} height={8} rx={4} fill="var(--ill-ink)" fillOpacity={0.12} />
          <rect id="ptc-bar" x={400} y={186} width={104} height={8} rx={4} fill="var(--ill-teal)" />
        </g>
      </g>
      <g id="ptc-seal" transform="translate(472 66)">
        <Seal size={56} />
      </g>
    </Svg>
  );
}

export function AuditPackFan({ size }: Props) {
  const angles = [-18, -7, 7, 18];
  return (
    <Svg w={480} h={360} size={size}>
      {angles.map((a) => (
        <g key={a} transform={`rotate(${a} 240 320)`}>
          <g transform="translate(165 96)">
            <Paper size={150} />
          </g>
        </g>
      ))}
      <g transform="translate(165 84)">
        <Paper size={150} lines={3} />
        <text
          x={48}
          y={70}
          fontSize={13}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill="var(--ill-ink)"
          fillOpacity={0.55}
          stroke="none"
        >
          Audit pack
        </text>
      </g>
      <g transform="translate(252 196)">
        <Seal size={72} />
      </g>
    </Svg>
  );
}
