"use client";

import { useEffect, useMemo, useState } from "react";

export interface UsePagedItemsResult<T> {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  pagedItems: T[];
  totalItems: number;
}

export function usePagedItems<T>(items: T[] | null | undefined, pageSize = 10): UsePagedItemsResult<T> {
  const [page, setPage] = useState(1);
  const list = items ?? [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  return { page, setPage, totalPages, pagedItems, totalItems };
}
