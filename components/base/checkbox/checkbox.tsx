import { Check } from "@untitledui/icons";
import { Checkbox as AriaCheckbox, type CheckboxProps as AriaCheckboxProps } from "react-aria-components";
import { cx } from "@/utils/cx";

export interface CheckboxProps extends Omit<AriaCheckboxProps, "children"> {
  size?: "sm" | "md";
}

const sizeStyles: Record<NonNullable<CheckboxProps["size"]>, string> = {
  sm: "h-4 w-4 rounded",
  md: "h-5 w-5 rounded-md",
};

const iconSize: Record<NonNullable<CheckboxProps["size"]>, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
};

export function Checkbox({ size = "sm", className, ...rest }: CheckboxProps) {
  return (
    <AriaCheckbox
      {...rest}
      className={(values) =>
        cx(
          "group inline-flex shrink-0 items-center justify-center outline-none",
          typeof className === "function" ? className(values) : className,
        )
      }
    >
      {({ isSelected, isIndeterminate, isFocusVisible }) => (
        <span
          className={cx(
            "inline-flex items-center justify-center border transition-colors",
            sizeStyles[size],
            isSelected || isIndeterminate
              ? "bg-bg-brand-solid border-bg-brand-solid text-fg-white"
              : "bg-bg-primary border-border-primary text-transparent",
            isFocusVisible && "ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-primary",
          )}
        >
          <Check className={cx(iconSize[size], (isSelected || isIndeterminate) ? "opacity-100" : "opacity-0")} strokeWidth={3} />
        </span>
      )}
    </AriaCheckbox>
  );
}
