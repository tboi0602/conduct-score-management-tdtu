"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, FilterX, Search, SlidersHorizontal } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EventReferenceSelect } from "@/components/admin/events/EventReferenceSelect";
import { EventOrganizerSelect } from "@/components/admin/events/EventOrganizerSelect";
import {
  filterPanel,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { EventReference } from "@/hooks/events/useEventOptions";
import type { EventFilters as Filters } from "@/types/events";
import type { OrganizingUnit } from "@/types/events";

export function EventFilters({
  searchTerm,
  onSearch,
  onApply,
  onClear,
}: {
  searchTerm: string;
  onSearch: (value: string) => void;
  onApply: (filters: Filters) => void;
  onClear: () => void;
}) {
  const { t } = useAdminTranslations();
  const [criterion, setCriterion] = useState<EventReference | null>(null);
  const [semester, setSemester] = useState<EventReference | null>(null);
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [organizer, setOrganizer] = useState<OrganizingUnit | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [invalidRange, setInvalidRange] = useState(false);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from && to && new Date(from) > new Date(to)) {
      setInvalidRange(true);
      return;
    }
    setInvalidRange(false);
    onApply({
      criteriaId: criterion?.id,
      semesterId: semester?.id,
      type,
      checkInMode: mode,
      organizerId: organizer?.id,
      startsFrom: from ? new Date(from).toISOString() : undefined,
      startsTo: to ? new Date(to).toISOString() : undefined,
      status: status ? (status as Filters["status"]) : undefined,
    });
  }
  function clear() {
    setCriterion(null);
    setSemester(null);
    setType("");
    setMode("");
    setStatus("");
    setOrganizer(null);
    setFrom("");
    setTo("");
    setInvalidRange(false);
    onClear();
  }
  const activeCount = [criterion, semester, type, mode, status, organizer, from, to].filter(
    Boolean,
  ).length;
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#cdd9e7] bg-white px-4 py-2.5 text-sm font-bold text-[#263b58] hover:border-[#9fb7d5]"
      >
        <SlidersHorizontal size={17} />
        {t.filters}
        {activeCount > 0 ? (
          <span className="rounded-full bg-[#154a9b] px-2 py-0.5 text-xs text-white">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <form onSubmit={apply} className={filterPanel}>
          <label className="block text-sm font-semibold text-[#263b58]">
            {t.search}
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-5 text-[#718096]"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={t.eventSearch}
                maxLength={100}
                className={`${inputClass} pl-10`}
              />
            </div>
          </label>
          {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 ? (
            <p className="mt-2 text-xs text-[#66758a]">{t.searchHint}</p>
          ) : null}
          <div className="mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2 text-xs font-semibold text-[#66758a]">
              <p>{t.eventStatus}</p>
              <CustomSelect
                value={status}
                onChange={setStatus}
                placeholder={t.allEventStatuses}
                ariaLabel={t.eventStatus}
                options={[
                  { value: "UPCOMING", label: t.UPCOMING },
                  { value: "ONGOING", label: t.ONGOING },
                  { value: "COMPLETED", label: t.COMPLETED },
                ]}
              />
            </div>
            <div className="space-y-2 text-xs font-semibold text-[#66758a]">
              <p>{t.organizer}</p>
              <EventOrganizerSelect selected={organizer} onChange={setOrganizer} />
            </div>
            <div className="space-y-2 text-xs font-semibold text-[#66758a]">
              <p>{t.criterion}</p>
              <EventReferenceSelect
                kind="criteria"
                selected={criterion}
                onChange={setCriterion}
                placeholder={t.allCriteria}
              />
            </div>
            <div className="space-y-2 text-xs font-semibold text-[#66758a]">
              <p>{t.semester}</p>
              <EventReferenceSelect
                kind="semesters"
                selected={semester}
                onChange={setSemester}
                placeholder={t.allSemesters}
              />
            </div>
            <div className="space-y-2 text-xs font-semibold text-[#66758a]">
              <p>{t.eventType}</p>
              <CustomSelect
                value={type}
                onChange={setType}
                placeholder={t.allEventTypes}
                ariaLabel={t.eventType}
                options={(["UNIVERSITY", "FACULTY", "CLASS", "CLUB"] as const).map((value) => ({
                  value,
                  label: t[value],
                }))}
              />
            </div>
            <div className="space-y-2 text-xs font-semibold text-[#66758a]">
              <p>{t.checkInMode}</p>
              <CustomSelect
                value={mode}
                onChange={setMode}
                placeholder={t.allCheckInModes}
                ariaLabel={t.checkInMode}
                options={(["ONE_WAY", "TWO_WAY"] as const).map((value) => ({
                  value,
                  label: t[value],
                }))}
              />
            </div>
          </div>
          <div className="mt-4 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-semibold text-[#66758a]">
              {t.startsFrom}
              <input
                type="datetime-local"
                step={1}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#66758a]">
              {t.startsTo}
              <input
                type="datetime-local"
                step={1}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className={inputClass}
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className={primaryButton}>
                {t.applyFilter}
              </button>
              <button type="button" onClick={clear} className={secondaryButton}>
                <FilterX size={16} />
                {t.clearFilter}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#66758a]">
            {t.dateFilterHint} {t.localTimeHint}
          </p>
          {invalidRange ? (
            <p role="alert" className="mt-3 text-sm text-[#b72e3f]">
              {t.invalidRange}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
