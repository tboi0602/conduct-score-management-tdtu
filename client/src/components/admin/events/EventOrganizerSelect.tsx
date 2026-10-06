"use client";

import { CustomSelect } from "@/components/ui/CustomSelect";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useEventOrganizerOptions } from "@/hooks/events/useEventOptions";
import { organizerLabel } from "@/lib/event-form";
import type { OrganizingUnit } from "@/types/events";

export function EventOrganizerSelect({
  selected,
  onChange,
  disabled,
  facultyId,
  placeholder,
}: {
  selected: OrganizingUnit | null;
  onChange: (unit: OrganizingUnit | null) => void;
  disabled?: boolean;
  facultyId?: string;
  placeholder?: string;
}) {
  const { t } = useAdminTranslations();
  const { search, setSearch, query, items } = useEventOrganizerOptions(
    selected,
    onChange,
    facultyId,
  );
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
        placeholder={placeholder ?? t.selectOrganizer}
        options={items.map((item) => ({ value: item.id, label: organizerLabel(item) }))}
      />
    </div>
  );
}
