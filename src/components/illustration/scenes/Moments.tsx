import { Svg } from "../kit/shared";
import { ChainLink, Paper, PaperStack, Seal } from "../kit";

type Props = { size?: number };

export function SealedConfirmation({ size }: Props) {
  return (
    <Svg w={96} h={96} size={size}>
      <g transform="translate(6 14)">
        <Paper size={56} folded />
      </g>
      <g transform="translate(48 40)">
        <Seal size={44} />
      </g>
    </Svg>
  );
}

export function TamperDetected({ size }: Props) {
  return (
    <Svg w={96} h={96} size={size}>
      <g transform="translate(4 26)">
        <ChainLink size={88} torn />
      </g>
      <line x1={70} y1={22} x2={76} y2={10} stroke="var(--ill-terracotta)" strokeWidth={3} />
      <line x1={80} y1={26} x2={88} y2={16} stroke="var(--ill-terracotta)" strokeWidth={3} />
      <line x1={70} y1={74} x2={76} y2={86} stroke="var(--ill-terracotta)" strokeWidth={3} />
      <line x1={80} y1={70} x2={88} y2={80} stroke="var(--ill-terracotta)" strokeWidth={3} />
    </Svg>
  );
}

export function RecordsVerified({ size }: Props) {
  return (
    <Svg w={96} h={96} size={size}>
      <g transform="translate(2 8)">
        <PaperStack size={64} />
      </g>
      <g transform="translate(52 48)">
        <Seal size={40} />
      </g>
    </Svg>
  );
}
