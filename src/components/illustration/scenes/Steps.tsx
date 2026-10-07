import type { ReactNode } from "react";
import { Svg } from "../kit/shared";
import { Magnifier, Paper, Seal, Stamp, Thread } from "../kit";

type Props = { size?: number };

function StepScene({ size, object }: { size?: number; object: ReactNode }) {
  return (
    <Svg w={480} h={360} size={size}>
      <g transform="translate(56 96)">
        <Paper folded size={196} />
      </g>
      <g transform="translate(190 24)">
        <Thread size={220} className="how-thread" ends={false} />
      </g>
      <g className="step-object">{object}</g>
    </Svg>
  );
}

export function StepDetect({ size }: Props) {
  return (
    <StepScene
      size={size}
      object={
        <g transform="translate(336 40)">
          <Magnifier size={112} found />
        </g>
      }
    />
  );
}

export function StepExplain({ size }: Props) {
  return (
    <StepScene
      size={size}
      object={
        <g transform="translate(344 44)">
          <Paper size={96} highlight={1} />
        </g>
      }
    />
  );
}

export function StepDecide({ size }: Props) {
  return (
    <StepScene
      size={size}
      object={
        <g transform="translate(340 44)">
          <Stamp size={104} />
        </g>
      }
    />
  );
}

export function StepProve({ size }: Props) {
  return (
    <StepScene
      size={size}
      object={
        <g transform="translate(344 36)">
          <Seal size={96} />
        </g>
      }
    />
  );
}
