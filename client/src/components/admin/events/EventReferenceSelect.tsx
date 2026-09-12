"use client";

import { Skeleton } from "boneyard-js/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useEventOptions, type EventReference } from "@/hooks/events/useEventOptions";
import { semesterLabel } from "@/lib/event-form";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { inputClass } from "@/components/admin/management-styles";

export function EventReferenceSelect({
  kind,
  selected,
  onChange,
  placeholder,
  name,
  disabled = false,
}: {
  kind: "criteria" | "semesters";
  selected: EventReference | null;
  onChange: (item: EventReference | null) => void;
  placeholder: string;
  name?: string;
  disabled?: boolean;
}) {
  const { t } = useAdminTranslations();
  const query = useEventOptions(kind);
  const records = query.data?.data ?? [];
  const options =
    selected && !records.some((item) => item.id === selected.id) ? [selected, ...records] : records;
  const pagination = query.data?.pagination;
  return (
    <div className="space-y-2">
      <CustomSelect
        name={name}
        value={selected?.id ?? ""}
        ariaLabel={kind === "criteria" ? t.criterion : t.semester}
        onChange={(id) => onChange(options.find((item) => item.id === id) ?? null)}
        options={options.map((item) => ({
          value: item.id,
          label: "title" in item ? item.title : semesterLabel(item, t),
        }))}
        placeholder={placeholder}
        disabled={disabled || query.isFetching || Boolean(query.error) || query.invalidYear}
      />
      <input
        aria-label={kind === "criteria" ? t.optionSearch : t.yearSearch}
        type={kind === "semesters" ? "number" : "search"}
        min={kind === "semesters" ? 0 : undefined}
        max={kind === "semesters" ? 2147483647 : undefined}
        maxLength={100}
        value={query.search}
        onChange={(event) => query.setSearch(event.target.value)}
        disabled={disabled}
        placeholder={kind === "criteria" ? t.optionSearch : t.yearSearch}
        className={`${inputClass} !mt-2 !min-h-9 !text-xs`}
      />
      {kind === "criteria" && query.search.trim().length > 0 && query.search.trim().length < 3 ? (
        <p className="text-xs font-normal text-[#66758a]">{t.searchHint}</p>
      ) : null}
      {query.invalidYear ? (
        <p role="alert" className="text-xs text-[#b72e3f]">
          {t.invalidFields}
        </p>
      ) : null}
      {query.isFetching ? (
        <Skeleton
          loading
          name="event-reference"
          initialBones={{
            name: "event-reference",
            viewportWidth: 300,
            width: 300,
            height: 16,
            bones: [[0, 2, 70, 10, 4]],
          }}
        >
          <div />
        </Skeleton>
      ) : null}
      {query.error ? (
        <ManagementError
          error={query.error}
          fallback={t.loadError}
          retry={() => void query.refetch()}
        />
      ) : null}
      {!query.isFetching && !query.error && !query.invalidYear && records.length === 0 ? (
        <p className="text-xs font-normal text-[#66758a]">
          {query.search ? t.noOptions : kind === "criteria" ? t.noCriteriaOptions : t.noSemesters}
        </p>
      ) : null}
      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-xs font-normal text-[#66758a]">
          <button
            type="button"
            disabled={disabled || query.isFetching || !pagination.hasPreviousPage}
            onClick={() => query.setPage((page) => page - 1)}
            className="rounded px-1 py-1 hover:text-[#154a9b] disabled:opacity-40"
          >
            {t.previous}
          </button>
          <span>
            {t.page} {pagination.page}/{pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={
              disabled ||
              query.isFetching ||
              !pagination.hasNextPage ||
              pagination.page * 20 > 10000
            }
            onClick={() => query.setPage((page) => page + 1)}
            className="rounded px-1 py-1 hover:text-[#154a9b] disabled:opacity-40"
          >
            {t.next}
          </button>
        </div>
      ) : null}
    </div>
  );
}
