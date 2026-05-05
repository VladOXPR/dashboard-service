import type { SVGProps } from "react";

export function Dot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 8 8" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
}
