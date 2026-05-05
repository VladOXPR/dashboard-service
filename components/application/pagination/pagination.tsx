"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { Pagination, type PaginationRootProps } from "./pagination-base";

interface PaginationPageMinimalCenterProps extends Omit<PaginationRootProps, "children"> {
  className?: string;
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
}

const buttonStyles = cx(
  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
  "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary_hover",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-tertiary",
);

const pageButtonBase = cx(
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
  "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary_hover",
);

const pageButtonActive = "bg-bg-quaternary text-text-primary hover:bg-bg-quaternary";

export function PaginationPageMinimalCenter({
  page,
  total,
  siblingCount = 1,
  onPageChange,
  className,
  prevLabel = "Previous",
  nextLabel = "Next",
}: PaginationPageMinimalCenterProps) {
  if (total <= 1) return null;
  return (
    <Pagination.Root
      page={page}
      total={total}
      siblingCount={siblingCount}
      onPageChange={onPageChange}
      className={cx("flex items-center justify-between gap-2 border-t border-border-secondary", className)}
    >
      <Pagination.PrevTrigger>
        <button type="button" className={buttonStyles}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{prevLabel}</span>
        </button>
      </Pagination.PrevTrigger>

      <div className="flex items-center gap-0.5">
        <Pagination.Context>
          {({ pages, currentPage, onPageChange: change }) =>
            pages.map((item) =>
              item.type === "ellipsis" ? (
                <span key={item.key} className="px-1 text-sm text-text-quaternary">
                  …
                </span>
              ) : (
                <button
                  key={`p-${item.page}`}
                  type="button"
                  onClick={() => change(item.page)}
                  aria-current={item.page === currentPage ? "page" : undefined}
                  className={cx(pageButtonBase, item.page === currentPage && pageButtonActive)}
                >
                  {item.page}
                </button>
              ),
            )
          }
        </Pagination.Context>
      </div>

      <Pagination.NextTrigger>
        <button type="button" className={buttonStyles}>
          <span className="hidden sm:inline">{nextLabel}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </Pagination.NextTrigger>
    </Pagination.Root>
  );
}
