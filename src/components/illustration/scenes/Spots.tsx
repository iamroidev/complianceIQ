import { Svg } from "../kit/shared";
import {
  Calendar,
  Certificate,
  CodeCard,
  CoinStack,
  Key,
  Magnifier,
  Paper,
  Receipt,
  Thread,
  VendorBox,
} from "../kit";

type Props = { size?: number; hint?: boolean };

export function SpotCertificate({ size, hint }: Props) {
  return (
    <Svg w={160} h={160} size={size}>
      <g transform="translate(24 18)">
        <Certificate size={104} expired={hint} />
      </g>
      <g transform="translate(86 82)">
        <Calendar size={64} today={11} expired={hint} />
      </g>
    </Svg>
  );
}

export function SpotPayment({ size, hint }: Props) {
  return (
    <Svg w={160} h={160} size={size}>
      <g transform="translate(14 60)">
        <CoinStack size={96} />
      </g>
      <g transform="translate(92 22)" className="spot-lift" data-on={hint ? "true" : undefined}>
        <Receipt size={56} />
      </g>
      <g transform="translate(52 39)">
        <Thread size={92} ends={false} />
      </g>
    </Svg>
  );
}

export function SpotDeadline({ size, hint }: Props) {
  return (
    <Svg w={160} h={160} size={size}>
      <g transform="translate(30 12)" className="spot-flip">
        <Calendar size={100} today={4} expired={hint} />
      </g>
      <g transform="translate(24 96)">
        <Thread size={112} />
      </g>
    </Svg>
  );
}

export function SpotAccess({ size }: Props) {
  return (
    <Svg w={160} h={160} size={size} className="spot-access">
      <g transform="translate(22 22)">
        <Paper size={96} folded />
      </g>
      <g transform="translate(56 92)">
        <Key size={96} />
      </g>
    </Svg>
  );
}

export function SpotVendor({ size, missing = true, hint }: Props & { missing?: boolean }) {
  return (
    <Svg w={160} h={160} size={size}>
      <g transform="translate(24 20)">
        <VendorBox size={112} missing={missing || Boolean(hint)} />
      </g>
    </Svg>
  );
}

export function SpotCode({ size }: Props) {
  return (
    <Svg w={160} h={160} size={size}>
      <g transform="translate(12 30)">
        <CodeCard size={136} />
      </g>
      <g transform="translate(24 6)">
        <Magnifier size={54} found />
      </g>
    </Svg>
  );
}
