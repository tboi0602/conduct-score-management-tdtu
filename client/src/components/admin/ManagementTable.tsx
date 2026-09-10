"use client";

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { PaginationMeta } from "@/types/admin";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";

export function ManagementTable({
  headers,
  loading,
  fetching,
  error,
  count,
  pagination,
  onPageChange,
  retry,
  children,
}: {
  headers: string[];
  loading: boolean;
  fetching: boolean;
  error: unknown;
  count: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  retry: () => void;
  children: ReactNode;
}) {
  const { t } = useAdminTranslations();
  return (
    <div
      aria-busy={fetching}
      className="mt-5 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white shadow-[0_18px_45px_-30px_rgba(31,67,111,.4)]"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-[.1em] text-[#68788d]">
            <tr>
              <th scope="col" className="w-20 px-5 py-4 text-center">
                {t.ordinal}
              </th>
              {headers.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-5 py-4 ${index === headers.length - 1 ? "text-right" : ""}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          {loading || fetching ? (
            <TableSkeleton columns={headers.length + 1} />
          ) : (
            <tbody className="divide-y divide-[#e7ecf3]">
              {Children.map(children, (child, index) => {
                if (!isValidElement(child)) return child;
                const row = child as ReactElement<{ children?: ReactNode }>;
                return cloneElement(
                  row,
                  undefined,
                  <td className="w-20 px-5 py-4 text-center tabular-nums text-[#66758a]">
                    {(pagination.page - 1) * pagination.limit + index + 1}
                  </td>,
                  row.props.children,
                );
              })}
            </tbody>
          )}
        </table>
      </div>
      {!loading && !fetching && !error && count === 0 ? (
        <EmptyTable title={t.noData} description={t.tryFilter} />
      ) : null}
      {error ? (
        <div className="p-4">
          <ManagementError error={error} fallback={t.loadError} retry={retry} />
        </div>
      ) : null}
      <PaginationControls
        pagination={pagination}
        onPageChange={onPageChange}
        disabled={fetching || Boolean(error)}
        maxOffset={10000}
      />
      {pagination.hasNextPage && pagination.page * pagination.limit > 10000 ? (
        <p className="px-5 pb-4 text-sm text-[#66758a]">{t.offsetHint}</p>
      ) : null}
    </div>
  );
}
