import type { CSSProperties, SVGProps } from "react";
import { useId } from "react";

export const shadowG: CSSProperties = {
  filter: "drop-shadow(var(--ill-shadow))",
};

export function rootStyle(extra?: CSSProperties): CSSProperties {
  return {
    stroke: "var(--ill-ink)",
    strokeWidth: "var(--ill-stroke)",
    strokeLinejoin: "round",
    strokeLinecap: "round",
    display: "block",
    ...extra,
  };
}

export function useLayerId(name: string): string {
  const uid = useId().replace(/:/g, "");
  return `${uid}-${name}`;
}

export type BaseProps = SVGProps<SVGSVGElement> & { size?: number };

export function Svg({
  w,
  h,
  size,
  style,
  children,
  ...rest
}: BaseProps & { w: number; h: number; children: React.ReactNode }) {
  const width = size ?? w;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={width}
      height={(width * h) / w}
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={rootStyle(style)}
      {...rest}
    >
      {children}
    </svg>
  );
}
