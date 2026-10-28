"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Client-side pagination. Pass filter primitives as separate args after `pageSize`
 * so page resets when they change (do not pass a freshly allocated array).
 */
export function usePagedList<T>(items: T[], pageSize: number, ...resetDeps: unknown[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageClamped = Math.min(Math.max(1, page), totalPages);

  /* Variadic deps: callers pass primitives so the list resets when filters change (not a literal array). */
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setPage(1);
  }, resetDeps);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(
    () => items.slice((pageClamped - 1) * pageSize, pageClamped * pageSize),
    [items, pageClamped, pageSize],
  );

  const goPage = useCallback(
    (next: number) => {
      setPage(Math.min(Math.max(1, next), totalPages));
    },
    [totalPages],
  );

  const rangeFrom = items.length === 0 ? 0 : (pageClamped - 1) * pageSize + 1;
  const rangeTo = items.length === 0 ? 0 : Math.min(pageClamped * pageSize, items.length);

  return {
    pagedItems,
    page: pageClamped,
    totalPages,
    totalItems: items.length,
    rangeFrom,
    rangeTo,
    goPage,
  };
}
