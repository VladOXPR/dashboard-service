import type { ReactNode } from "react";
import { Dot } from "@/components/foundations/dot-icon";
import { cx } from "@/utils/cx";
import type { BadgeColor, BadgeColors, BadgeSizes, BadgeTypes } from "./badge-types";

export type { BadgeColor, BadgeColors, BadgeSizes, BadgeTypes };

const sizeStyles: Record<BadgeSizes, string> = {
  sm: "px-1.5 py-0.5 text-xs gap-1",
  md: "px-2 py-0.5 text-xs gap-1.5",
  lg: "px-2.5 py-1 text-sm gap-1.5",
};

const dotSizeStyles: Record<BadgeSizes, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2 h-2",
};

/* Color variants per Untitled UI badge type. Foreground/background pairs are
 * tuned for the CUUB dark theme via tokens defined in styles/theme.css. */
const colorStyles: Record<BadgeTypes, Record<BadgeColors, string>> = {
  "pill-color": {
    gray: "bg-utility-gray-100 text-utility-gray-700 ring-1 ring-inset ring-utility-gray-200",
    brand: "bg-utility-brand-50 text-utility-brand-700 ring-1 ring-inset ring-utility-brand-200",
    error: "bg-utility-error-100 text-utility-error-700 ring-1 ring-inset ring-utility-error-200",
    warning: "bg-utility-warning-100 text-utility-warning-700 ring-1 ring-inset ring-utility-warning-200",
    success: "bg-utility-success-100 text-utility-success-700 ring-1 ring-inset ring-utility-success-200",
    blue: "bg-utility-brand-50 text-utility-brand-700 ring-1 ring-inset ring-utility-brand-200",
    indigo: "bg-utility-brand-50 text-utility-brand-700 ring-1 ring-inset ring-utility-brand-200",
    purple: "bg-utility-brand-50 text-utility-brand-700 ring-1 ring-inset ring-utility-brand-200",
    pink: "bg-utility-error-100 text-utility-error-700 ring-1 ring-inset ring-utility-error-200",
    orange: "bg-utility-warning-100 text-utility-warning-700 ring-1 ring-inset ring-utility-warning-200",
  },
  color: {
    gray: "bg-utility-gray-100 text-utility-gray-700",
    brand: "bg-utility-brand-50 text-utility-brand-700",
    error: "bg-utility-error-100 text-utility-error-700",
    warning: "bg-utility-warning-100 text-utility-warning-700",
    success: "bg-utility-success-100 text-utility-success-700",
    blue: "bg-utility-brand-50 text-utility-brand-700",
    indigo: "bg-utility-brand-50 text-utility-brand-700",
    purple: "bg-utility-brand-50 text-utility-brand-700",
    pink: "bg-utility-error-100 text-utility-error-700",
    orange: "bg-utility-warning-100 text-utility-warning-700",
  },
  modern: {
    gray: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    brand: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    error: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    warning: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    success: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    blue: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    indigo: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    purple: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    pink: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
    orange: "bg-secondary text-secondary ring-1 ring-inset ring-border-primary",
  },
};

const dotColors: Record<BadgeColors, string> = {
  gray: "text-utility-gray-500",
  brand: "text-utility-brand-500",
  error: "text-utility-error-500",
  warning: "text-utility-warning-500",
  success: "text-utility-success-600",
  blue: "text-utility-brand-500",
  indigo: "text-utility-brand-500",
  purple: "text-utility-brand-500",
  pink: "text-utility-error-500",
  orange: "text-utility-warning-500",
};

interface BadgeBaseProps {
  type?: BadgeTypes;
  size?: BadgeSizes;
  color?: BadgeColors;
  className?: string;
  children?: ReactNode;
}

export function Badge({ type = "pill-color", size = "md", color = "gray", className, children }: BadgeBaseProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap",
        sizeStyles[size],
        colorStyles[type][color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface BadgeWithDotProps extends BadgeBaseProps {
  dotClassName?: string;
}

export function BadgeWithDot({
  type = "pill-color",
  size = "sm",
  color = "gray",
  className,
  dotClassName,
  children,
}: BadgeWithDotProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap",
        sizeStyles[size],
        colorStyles[type][color],
        className,
      )}
    >
      <Dot className={cx(dotSizeStyles[size], dotColors[color], dotClassName)} />
      {children}
    </span>
  );
}
