"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

export type DataTablePaginationProps = {
  totalItems: number;
  page: number;
  totalPages: number;
  rangeFrom: number;
  rangeTo: number;
  onPageChange: (page: number) => void;
};

export function DataTablePagination({
  totalItems,
  page,
  totalPages,
  rangeFrom,
  rangeTo,
  onPageChange,
}: DataTablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{rangeFrom}</span>
        {"–"}
        <span className="font-medium text-foreground">{rangeTo}</span>
        {" of "}
        <span className="font-medium text-foreground">{totalItems}</span>
        <span className="hidden sm:inline"> · Page </span>
        <span className="sm:hidden">
          <br />
          Page{" "}
        </span>
        <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      <Pagination className="mx-0 w-full justify-end sm:w-auto">
        <PaginationContent className="flex-wrap justify-end">
          <PaginationItem>
            <PaginationLink
              href="#"
              size="icon"
              aria-label="First page"
              className={page <= 1 ? "pointer-events-none opacity-40" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(1);
              }}
            >
              <ChevronsLeft className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className={page <= 1 ? "pointer-events-none opacity-40" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          {totalPages <= 9
            ? Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))
            : (
                <PaginationItem>
                  <span className="flex h-9 min-w-[2.5rem] items-center justify-center px-2 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                </PaginationItem>
              )}
          <PaginationItem>
            <PaginationNext
              href="#"
              className={page >= totalPages ? "pointer-events-none opacity-40" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(page + 1);
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href="#"
              size="icon"
              aria-label="Last page"
              className={page >= totalPages ? "pointer-events-none opacity-40" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(totalPages);
              }}
            >
              <ChevronsRight className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
