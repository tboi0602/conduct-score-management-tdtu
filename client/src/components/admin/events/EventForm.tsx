"use client";

import { useState, type FormEvent } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EventOrganizerSelect } from "@/components/admin/events/EventOrganizerSelect";
import { RichTextEditor } from "@/components/admin/events/RichTextEditor";
import { EventReferenceSelect } from "@/components/admin/events/EventReferenceSelect";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { inputClass, primaryButton, secondaryButton } from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { EventReference } from "@/hooks/events/useEventOptions";
import { localDateTime } from "@/lib/event-form";
import type { ManagedEvent } from "@/types/events";

export function EventForm({
  event,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  event: ManagedEvent | null;
  saving: boolean;
  error: unknown;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const { t } = useAdminTranslations();
  const [criterion, setCriterion] = useState<EventReference | null>(event?.criteria ?? null);
  const [semester, setSemester] = useState<EventReference | null>(event?.semester ?? null);
  const [organizer, setOrganizer] = useState(event?.organizer ?? null);
  const [description, setDescription] = useState(event?.description ?? "");
  const [mode, setMode] = useState<string>(event?.checkInMode ?? "ONE_WAY");
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5">
        <label className="block text-sm font-semibold text-[#263b58]">
          {t.eventName}
          <input
            name="name"
            required
            maxLength={255}
            autoFocus
            defaultValue={event?.name ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-semibold text-[#263b58]">
          {t.location}
          <input
            name="location"
            required
            maxLength={255}
            defaultValue={event?.location ?? ""}
            className={inputClass}
          />
        </label>
        <div className="space-y-2 text-sm font-semibold text-[#263b58]">
          <p>{t.detailDescription}</p>
          <input type="hidden" name="description" value={description} />
          <RichTextEditor value={description} onChange={setDescription} disabled={saving} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 text-sm font-semibold text-[#263b58]">
            <p>{t.criterion}</p>
            <EventReferenceSelect
              name="criteriaId"
              kind="criteria"
              selected={criterion}
              onChange={setCriterion}
              placeholder={t.selectCriteria}
              disabled={saving}
            />
          </div>
          <div className="space-y-2 text-sm font-semibold text-[#263b58]">
            <p>{t.semester}</p>
            <EventReferenceSelect
              name="semesterId"
              kind="semesters"
              selected={semester}
              onChange={setSemester}
              placeholder={t.selectSemester}
              disabled={saving}
            />
          </div>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.timeStart}
            <input
              name="timeStart"
              type="datetime-local"
              step={1}
              required
              defaultValue={localDateTime(event?.timeStart)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.timeEnd}
            <input
              name="timeEnd"
              type="datetime-local"
              step={1}
              required
              defaultValue={localDateTime(event?.timeEnd)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.registrationStart}
            <input
              name="registrationStart"
              type="datetime-local"
              step={1}
              required
              defaultValue={localDateTime(event?.registrationStart)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.registrationEnd}
            <input
              name="registrationEnd"
              type="datetime-local"
              step={1}
              required
              defaultValue={localDateTime(event?.registrationEnd)}
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-xs leading-5 text-[#66758a]">{t.localTimeHint}</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 text-sm font-semibold text-[#263b58]">
            <p>{t.organizer}</p>
            <EventOrganizerSelect selected={organizer} onChange={setOrganizer} disabled={saving} />
          </div>
          <div className="space-y-2 text-sm font-semibold text-[#263b58]">
            <p>{t.checkInMode}</p>
            <CustomSelect
              name="checkInMode"
              value={mode}
              onChange={setMode}
              ariaLabel={t.checkInMode}
              disabled={saving}
              placeholder={t.selectCheckInMode}
              options={(["ONE_WAY", "TWO_WAY"] as const).map((value) => ({
                value,
                label: t[value],
              }))}
            />
          </div>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.points}
            <input
              name="points"
              type="number"
              required
              min={0}
              max={2147483647}
              step={1}
              defaultValue={event?.points ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.capacity}
            <input
              name="capacity"
              type="number"
              min={1}
              max={2147483647}
              step={1}
              defaultValue={event?.capacity ?? ""}
              placeholder={t.unlimited}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#263b58]">
            {t.attendanceRadius}
            <input
              name="attendanceRadiusMeters"
              type="number"
              required
              min={10}
              max={5000}
              step={1}
              defaultValue={event?.attendanceRadiusMeters ?? 100}
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>
      <ManagementError error={error} fallback={t.saveError} />
      <div className="flex justify-end gap-3 border-t border-[#e6ebf2] pt-5">
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={saving || !criterion || !semester || !organizer || !mode}
          className={primaryButton}
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
