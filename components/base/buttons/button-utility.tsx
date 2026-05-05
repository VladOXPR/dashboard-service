"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import { isReactComponent } from "@/utils/is-react-component";

type IconType = ComponentType<SVGProps<SVGSVGElement>> | ReactNode;

export interface ButtonUtilityProps extends Omit<AriaButtonProps, "children"> {
  size?: "xs" | "sm";
  color?: "secondary" | "tertiary";
  icon?: IconType;
  tooltip?: ReactNode;
  tooltipPlacement?: "top" | "bottom" | "left" | "right";
  className?: string;
  children?: ReactNode;
}

const sizeStyles: Record<NonNullable<ButtonUtilityProps["size"]>, string> = {
  xs: "h-7 w-7 rounded-md",
  sm: "h-8 w-8 rounded-md",
};

const iconSize: Record<NonNullable<ButtonUtilityProps["size"]>, string> = {
  xs: "h-4 w-4",
  sm: "h-4 w-4",
};

const colorStyles: Record<NonNullable<ButtonUtilityProps["color"]>, string> = {
  secondary:
    "bg-bg-secondary text-fg-tertiary border border-border-primary hover:bg-bg-quaternary hover:text-fg-primary",
  tertiary:
    "bg-transparent text-fg-tertiary hover:bg-bg-quaternary hover:text-fg-primary",
};

export function ButtonUtility({
  size = "sm",
  color = "tertiary",
  icon,
  tooltip,
  tooltipPlacement = "top",
  className,
  children,
  ...buttonProps
}: ButtonUtilityProps) {
  let iconNode: ReactNode = null;
  if (icon) {
    if (isReactComponent(icon)) {
      const IconComp = icon as ComponentType<SVGProps<SVGSVGElement>>;
      iconNode = <IconComp className={iconSize[size]} aria-hidden="true" />;
    } else {
      iconNode = icon as ReactNode;
    }
  }

  const button = (
    <AriaButton
      {...buttonProps}
      className={cx(
        "inline-flex items-center justify-center transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeStyles[size],
        colorStyles[color],
        className,
      )}
    >
      {iconNode ?? children}
    </AriaButton>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement={tooltipPlacement}>
        {button}
      </Tooltip>
    );
  }
  return button;
}
