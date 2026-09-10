"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useDebounce } from "@/hooks/useDebounce";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { organizerLabel } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";
import type { OrganizingUnit } from "@/types/events";

export function EventOrganizerSelect({
  selected,
  onChange,
  disabled,
}: {
  selected: OrganizingUnit | null;
  onChange: (unit: OrganizingUnit | null) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const term = useDebounce(search.trim(), 500);
  const { profile } = useAdminAccess();
  const { t } = useAdminTranslations();
  const query = useQuery({
    queryKey: queryKeys.eventOptions.organizerPage(1, term),
    queryFn: () => eventService.organizers(1, term || undefined),
    staleTime: 5 * 60_000,
  });
  const items = query.data?.data ?? [];
  useEffect(() => {
    if (selected) return;
    const facultyUnit = items.find(
      (item) => item.type === "FACULTY" && item.facultyId === profile?.effectiveFaculty?.id,
    );
    if (facultyUnit) onChange(facultyUnit);
    else if (items.length === 1) onChange(items[0]);
  }, [items, onChange, profile?.effectiveFaculty?.id, selected]);
  return (
    <div className="space-y-2">
      <input
        className="w-full rounded-xl border border-[#d9e2ed] px-3 py-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.organizerSearch}
      />
      <CustomSelect
        name="organizerId"
        value={selected?.id ?? ""}
        onChange={(id) => onChange(items.find((item) => item.id === id) ?? null)}
        ariaLabel={t.organizer}
        disabled={disabled || query.isLoading}
        placeholder={t.selectOrganizer}
        options={items.map((item) => ({ value: item.id, label: organizerLabel(item) }))}
      />
    </div>
  );
}
