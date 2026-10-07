import { Svg, useLayerId } from "./shared";

type Props = {
  size?: number;
  progress?: number;
  ends?: boolean;
  /** Stable hook for scroll choreography (landing §17); defaults to a generated id. */
  id?: string;
  /** Selector hook for scroll choreography (landing §17); e.g. a class the pin scrubs. */
  className?: string;
};

export function Thread({ size, progress = 1, ends = true, id, className }: Props) {
  const pathId = useLayerId("thread");

  return (
    <Svg w={120} h={64} size={size}>
      <path
        id={id ?? pathId}
        className={className}
        d="M10 48 C 38 48, 34 16, 60 16 C 86 16, 82 48, 110 48"
        fill="none"
        stroke="var(--ill-teal)"
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.min(Math.max(progress, 0), 1)}
      />
      {ends && progress > 0.02 && (
        <circle
          cx={10}
          cy={48}
          r={4}
          fill="var(--ill-teal)"
          stroke="var(--ill-ink)"
        />
      )}
      {ends && progress > 0.98 && (
        <circle
          cx={110}
          cy={48}
          r={4}
          fill="var(--ill-teal)"
          stroke="var(--ill-ink)"
        />
      )}
    </Svg>
  );
}
