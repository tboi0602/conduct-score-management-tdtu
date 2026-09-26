"use client";

import { Modal } from "@/components/ui/Modal";
import { CalendarClock, MapPin, ShieldCheck, Users } from "lucide-react";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { formatDate, organizerLabel, semesterLabel } from "@/lib/event-form";
import type { ManagedEvent } from "@/types/events";

export function EventDetails({
  event,
  onClose,
}: {
  event: ManagedEvent | null;
  onClose: () => void;
}) {
  const { t, locale } = useAdminTranslations();
  if (!event) return null;
  const now = Date.now();
  const lifecycle =
    now < new Date(event.timeStart).getTime()
      ? "UPCOMING"
      : now <= new Date(event.timeEnd).getTime()
        ? "ONGOING"
        : "COMPLETED";
  const fields = [
    [t.criterion, event.criteria.title],
    [t.semester, semesterLabel(event.semester, t)],
    [t.timeEnd, formatDate(event.timeEnd, locale)],
    [t.registrationStart, formatDate(event.registrationStart, locale)],
    [t.registrationEnd, formatDate(event.registrationEnd, locale)],
    [t.eventType, t[event.type]],
    [t.organizer, event.organizer ? organizerLabel(event.organizer) : t.unknownOrganizer],
    [t.maxPoints, String(event.criteria.maxPoints)],
    [t.createdAt, formatDate(event.createdAt, locale)],
    [t.updatedAt, formatDate(event.updatedAt, locale)],
  ];
  return (
    <Modal open onClose={onClose} title={t.eventDetails} size="xl">
      <div className="rounded-[20px] bg-[#f4f7fb] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${lifecycle === "ONGOING" ? "bg-emerald-100 text-emerald-700" : lifecycle === "UPCOMING" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"}`}
            >
              {t[lifecycle]}
            </span>
            <h3 className="mt-3 break-words text-2xl font-bold text-[#102a50]">{event.name}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#52647d]">
              <MapPin size={17} className="text-[#154a9b]" />
              {event.location || t.locationPending}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-2xl font-bold text-[#154a9b]">{event.points}</p>
            <p className="text-xs text-[#66758a]">{t.points}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#e1e8f0] p-4">
          <CalendarClock size={19} className="text-[#154a9b]" />
          <p className="mt-3 text-xs font-semibold text-[#66758a]">{t.timeStart}</p>
          <p className="mt-1 text-sm font-bold text-[#263b58]">
            {formatDate(event.timeStart, locale)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e1e8f0] p-4">
          <Users size={19} className="text-[#154a9b]" />
          <p className="mt-3 text-xs font-semibold text-[#66758a]">{t.registrations}</p>
          <p className="mt-1 text-sm font-bold text-[#263b58]">
            {event.registeredCount}/{event.capacity ?? t.unlimited}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e1e8f0] p-4">
          <ShieldCheck size={19} className="text-[#154a9b]" />
          <p className="mt-3 text-xs font-semibold text-[#66758a]">{t.checkInMode}</p>
          <p className="mt-1 text-sm font-bold text-[#263b58]">{t[event.checkInMode]}</p>
        </div>
        <div className="rounded-2xl border border-[#e1e8f0] p-4">
          <ShieldCheck size={19} className="text-[#154a9b]" />
          <p className="mt-3 text-xs font-semibold text-[#66758a]">{t.deliveryMode}</p>
          <p className="mt-1 text-sm font-bold text-[#263b58]">{t[event.deliveryMode]}</p>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 rounded-2xl border border-[#e1e8f0] p-5 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">
              {label}
            </dt>
            <dd className="mt-2 break-words text-sm text-[#263b58]">{value}</dd>
          </div>
        ))}
      </dl>
      {event.description ? (
        <div className="mt-6 border-t border-[#e6ebf2] pt-5">
          <p className="mb-2 text-xs font-semibold text-[#66758a]">{t.detailDescription}</p>
          <div
            className="event-rich-content"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </div>
      ) : null}
    </Modal>
  );
}
