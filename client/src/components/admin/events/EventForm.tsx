"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EventOrganizerSelect } from "@/components/admin/events/EventOrganizerSelect";
import { RichTextEditor } from "@/components/admin/events/RichTextEditor";
import { EventReferenceSelect } from "@/components/admin/events/EventReferenceSelect";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { inputClass, primaryButton, secondaryButton } from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import type { EventReference } from "@/hooks/events/useEventOptions";
import { localDateTime } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { ManagedEvent, OrganizingUnit } from "@/types/events";
import type { Faculty } from "@/types/admin";

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
  const { profile } = useAdminAccess();
  const [criterion, setCriterion] = useState<EventReference | null>(event?.criteria ?? null);
  const [semester, setSemester] = useState<EventReference | null>(event?.semester ?? null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(() => {
    return event?.organizer?.facultyId ?? profile?.effectiveFaculty?.id ?? "";
  });
  const [organizer, setOrganizer] = useState<OrganizingUnit | null>(event?.organizer ?? null);
  const [description, setDescription] = useState(event?.description ?? "");
  const [images, setImages] = useState<string[]>(event?.images ?? []);
  const [mode, setMode] = useState<string>(event?.checkInMode ?? "ONE_WAY");
  const [deliveryMode, setDeliveryMode] = useState<string>(event?.deliveryMode ?? "OFFLINE");

  const facultiesQuery = useQuery({
    queryKey: queryKeys.academic.options,
    queryFn: adminService.getAcademicOptions,
    staleTime: 60 * 60_000,
  });
  const faculties = facultiesQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedFacultyId && profile?.effectiveFaculty?.id) {
      setSelectedFacultyId(profile.effectiveFaculty.id);
    }
  }, [profile?.effectiveFaculty?.id, selectedFacultyId]);
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
        <div className="space-y-3 rounded-2xl border border-[#d9e2ed] bg-[#f8fafc] p-4 text-sm font-semibold text-[#263b58]">
          <div className="flex items-center justify-between">
            <p>Hình ảnh sự kiện (Gallery)</p>
            <label className="cursor-pointer rounded-xl bg-[#edf4fc] px-3 py-1.5 text-xs font-bold text-[#154a9b] transition hover:bg-[#dce9f8]">
              + Thêm ảnh
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={saving}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((file) => {
                    if (file.size > 10 * 1024 * 1024) {
                      window.alert(`Ảnh "${file.name}" vượt quá 10MB`);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (!reader.result) return;
                      const img = new Image();
                      img.onload = () => {
                        const maxDim = 1600;
                        let { width, height } = img;
                        if (width > maxDim || height > maxDim) {
                          if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                          } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                          }
                        }
                        const canvas = document.createElement("canvas");
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                          ctx.drawImage(img, 0, 0, width, height);
                          const compressed = canvas.toDataURL("image/jpeg", 0.82);
                          setImages((prev) => [...prev, compressed]);
                        } else {
                          setImages((prev) => [...prev, String(reader.result)]);
                        }
                      };
                      img.src = String(reader.result);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {images.map((url, idx) => (
            <input key={idx} type="hidden" name="images" value={url} />
          ))}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((url, idx) => (
                <div key={idx} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#d8e2ed] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-normal text-[#718096]">Chưa có hình ảnh nào được tải lên cho sự kiện này.</p>
          )}
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
            <p>{t.deliveryMode}</p>
            <CustomSelect
              name="deliveryMode"
              value={deliveryMode}
              onChange={setDeliveryMode}
              ariaLabel={t.deliveryMode}
              disabled={saving}
              placeholder={t.deliveryMode}
              options={(["OFFLINE", "ONLINE"] as const).map((value) => ({
                value,
                label: t[value],
              }))}
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
            <p>{t.eventFaculty}</p>
            <CustomSelect
              value={selectedFacultyId}
              onChange={(fid) => {
                setSelectedFacultyId(fid);
                setOrganizer(null);
              }}
              ariaLabel={t.eventFaculty}
              disabled={saving || facultiesQuery.isLoading}
              placeholder={t.selectEventFaculty}
              options={faculties.map((fac) => ({
                value: fac.id,
                label: `${fac.code} — ${fac.name}`,
              }))}
            />
          </div>
          <div className="space-y-2 text-sm font-semibold text-[#263b58]">
            <p>{t.organizer}</p>
            <EventOrganizerSelect
              selected={organizer}
              onChange={setOrganizer}
              facultyId={selectedFacultyId || undefined}
              placeholder={t.defaultFacultyOrganizer}
              disabled={saving}
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
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
