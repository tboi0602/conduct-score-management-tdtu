"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { organizerLabel } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";
import type { OrganizingUnit } from "@/types/events";

export function EventOrganizerFilter({
  selected,
  search,
  onSearchChange,
  onChange,
}: {
  selected: OrganizingUnit | null;
  search: string;
  onSearchChange: (value: string) => void;
  onChange: (unit: OrganizingUnit | null) => void;
}) {
  const { t } = useAdminTranslations();
  const debouncedSearch = useDebounce(search.trim(), 500);
  const canSearch = debouncedSearch.length === 0 || debouncedSearch.length >= 3;
  const appliedSearch = debouncedSearch.length >= 3 ? debouncedSearch : undefined;
  const query = useQuery({
    queryKey: queryKeys.eventOptions.organizerPage(1, appliedSearch, undefined, false),
    queryFn: () => eventService.organizers(1, appliedSearch, undefined, 50, false),
    enabled: canSearch,
    staleTime: 5 * 60_000,
  });
  const items = query.data?.data ?? [];
  const selectedOption = selected ? { value: selected.id, label: organizerLabel(selected) } : null;

  return (
    <SearchableCombobox
      selected={selectedOption}
      search={search}
      onSearchChange={(value) => {
        onSearchChange(value);
        if (selected) onChange(null);
      }}
      onSelect={(option) => {
        if (!option) {
          onChange(null);
          onSearchChange("");
          return;
        }
        const unit = items.find((item) => item.id === option.value) ?? null;
        onChange(unit);
        onSearchChange(unit ? organizerLabel(unit) : "");
      }}
      options={items.map((item) => ({ value: item.id, label: organizerLabel(item) }))}
      placeholder={t.allOrganizers}
      ariaLabel={t.organizer}
      clearLabel={t.clearOrganizer}
      loadingLabel={t.loadingOptions}
      emptyMessage={t.noOptions}
      minimumCharactersMessage={t.searchHint}
      errorMessage={query.error ? t.loadError : undefined}
      retryLabel={t.retry}
      onRetry={() => void query.refetch()}
      loading={query.isFetching && canSearch}
    />
  );
}
