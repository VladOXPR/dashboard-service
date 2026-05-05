"use client";

import {
  cloneElement,
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

export interface PaginationRootProps {
  page: number;
  total: number;
  siblingCount?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export type PaginationItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: string };

interface PaginationContextValue {
  page: number;
  total: number;
  pages: PaginationItem[];
  onPageChange: (page: number) => void;
}

const PaginationContextInternal = createContext<PaginationContextValue | null>(null);

function usePaginationContext(): PaginationContextValue {
  const ctx = useContext(PaginationContextInternal);
  if (!ctx) throw new Error("Pagination subcomponents must be used inside <Pagination.Root>");
  return ctx;
}

function buildPages(current: number, total: number, sibling: number): PaginationItem[] {
  if (total <= 1) return [{ type: "page", page: 1 }];
  const pages: PaginationItem[] = [];
  const left = Math.max(2, current - sibling);
  const right = Math.min(total - 1, current + sibling);

  pages.push({ type: "page", page: 1 });
  if (left > 2) pages.push({ type: "ellipsis", key: "ell-start" });
  for (let p = left; p <= right; p += 1) pages.push({ type: "page", page: p });
  if (right < total - 1) pages.push({ type: "ellipsis", key: "ell-end" });
  if (total > 1) pages.push({ type: "page", page: total });
  return pages;
}

function Root({ page, total, siblingCount = 1, onPageChange, className, style, children }: PaginationRootProps) {
  const pages = useMemo(() => buildPages(page, total, siblingCount), [page, total, siblingCount]);
  const value = useMemo<PaginationContextValue>(
    () => ({ page, total, pages, onPageChange: onPageChange ?? (() => undefined) }),
    [page, total, pages, onPageChange],
  );
  return (
    <PaginationContextInternal.Provider value={value}>
      <nav aria-label="Pagination" className={className} style={style}>
        {children}
      </nav>
    </PaginationContextInternal.Provider>
  );
}

interface PrevTriggerProps {
  children: ReactElement<{ onClick?: () => void; disabled?: boolean }>;
}

function PrevTrigger({ children }: PrevTriggerProps) {
  const { page, onPageChange } = usePaginationContext();
  const disabled = page <= 1;
  return cloneElement(children, {
    onClick: () => !disabled && onPageChange(page - 1),
    disabled,
  });
}

interface NextTriggerProps {
  children: ReactElement<{ onClick?: () => void; disabled?: boolean }>;
}

function NextTrigger({ children }: NextTriggerProps) {
  const { page, total, onPageChange } = usePaginationContext();
  const disabled = page >= total;
  return cloneElement(children, {
    onClick: () => !disabled && onPageChange(page + 1),
    disabled,
  });
}

interface ContextRenderProps {
  children: (ctx: { pages: PaginationItem[]; currentPage: number; total: number; onPageChange: (page: number) => void }) => ReactNode;
}

function Context({ children }: ContextRenderProps) {
  const { page, total, pages, onPageChange } = usePaginationContext();
  return <>{children({ pages, currentPage: page, total, onPageChange })}</>;
}

export const Pagination = {
  Root,
  PrevTrigger,
  NextTrigger,
  Context,
};
