"use client";

import type { ReactNode } from "react";
import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
  type TooltipProps as AriaTooltipProps,
  type TooltipTriggerComponentProps,
} from "react-aria-components";
import { cx } from "@/utils/cx";

export interface TooltipProps extends Omit<AriaTooltipProps, "children" | "title"> {
  title: ReactNode;
  description?: ReactNode;
  arrow?: boolean;
  delay?: number;
  closeDelay?: number;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isDisabled?: boolean;
  trigger?: TooltipTriggerComponentProps["trigger"];
  children: ReactNode;
}

export function Tooltip({
  title,
  description,
  arrow = true,
  delay = 300,
  closeDelay,
  isOpen,
  defaultOpen,
  onOpenChange,
  isDisabled,
  trigger,
  placement = "top",
  offset = 8,
  children,
  ...overlayProps
}: TooltipProps) {
  return (
    <AriaTooltipTrigger
      delay={delay}
      closeDelay={closeDelay}
      isOpen={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      isDisabled={isDisabled}
      trigger={trigger}
    >
      {children}
      <AriaTooltip
        {...overlayProps}
        placement={placement}
        offset={offset}
        className={cx(
          "z-50 max-w-xs rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg",
          "bg-utility-gray-100 text-text-primary border border-border-primary",
          "data-[entering]:animate-in data-[entering]:fade-in data-[entering]:zoom-in-95",
          "data-[exiting]:animate-out data-[exiting]:fade-out data-[exiting]:zoom-out-95",
        )}
      >
        {arrow && (
          <OverlayArrow>
            <svg width={12} height={12} viewBox="0 0 12 12" className="block fill-utility-gray-100 stroke-border-primary">
              <path d="M0 0 L6 6 L12 0 Z" />
            </svg>
          </OverlayArrow>
        )}
        <div className="font-medium">{title}</div>
        {description ? <div className="mt-1 text-text-tertiary">{description}</div> : null}
      </AriaTooltip>
    </AriaTooltipTrigger>
  );
}

export const TooltipTrigger = AriaTooltipTrigger;
