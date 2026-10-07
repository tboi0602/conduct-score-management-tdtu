"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FacebookImageGallery, extractImagesFromHtml } from "@/components/ui/FacebookImageGallery";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { formatDate, organizerLabel } from "@/lib/event-form";
import { parseEventIdFromSlug } from "@/lib/slug";
import { eventRegistrationService } from "@/services/events";
import { useState } from "react";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const [cancelling, setCancelling] = useState(false);

  const slug = String(params?.slug ?? "");
  const eventId = useMemo(() => parseEventIdFromSlug(slug), [slug]);

  const {
    data: eventData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["events", "detail", eventId],
    queryFn: async () => {
      const res = await eventRegistrationService.detail(eventId);
      return res.data;
    },
    enabled: Boolean(eventId),
  });

  const registerMutation = useMutation({
    mutationFn: () => eventRegistrationService.register(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => eventRegistrationService.cancel(eventId),
    onSuccess: () => {
      setCancelling(false);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  if (error || !eventData) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <div className="rounded-2xl border border-[#fee2e2] bg-[#fff5f5] p-6 text-center">
          <p className="text-sm font-semibold text-[#b42332]">
            {t.loadError || "Không thể tải thông tin sự kiện hoặc sự kiện không tồn tại."}
          </p>
          <Link
            href="/events"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#154a9b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#103a7a]"
          >
            <ArrowLeft size={16} /> Quay lại danh sách sự kiện
          </Link>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const startTime = new Date(eventData.timeStart).getTime();
  const endTime = new Date(eventData.timeEnd).getTime();
  const regStartTime = new Date(eventData.registrationStart).getTime();
  const regEndTime = new Date(eventData.registrationEnd).getTime();

  const isPendingReg = now < regStartTime;
  const isFull = eventData.remainingSlots === 0;
  const isRegOpen = eventData.registrationOpen;
  const isRegistered = eventData.registrationStatus === "REGISTERED";

  const lifecycle = now < startTime ? t.upcoming : now <= endTime ? t.ongoing : t.completed;

  const lifecycleBadgeStyle =
    now < startTime
      ? "border border-amber-200 bg-amber-50 text-amber-700"
      : now <= endTime
        ? "border border-blue-200 bg-blue-50 text-[#154a9b]"
        : "border border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <nav className="flex items-center gap-2 text-sm text-[#66758a]">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 font-semibold transition hover:text-[#154a9b]"
        >
          <ArrowLeft size={16} />
          {locale === "vi" ? "Danh sách sự kiện" : "All events"}
        </Link>
        <span>/</span>
        <span className="truncate font-medium text-[#263b58]">{eventData.name}</span>
      </nav>

      <div className="overflow-hidden rounded-[28px] border border-[#d9e3ee] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#edf4fc] px-3 py-1 text-xs font-bold text-[#154a9b]">
                {eventData.points} {t.points}
              </span>
              <span className={`rounded-lg px-3 py-1 text-xs font-bold ${lifecycleBadgeStyle}`}>
                {lifecycle}
              </span>
              <span className="rounded-lg bg-[#f1f5f9] px-3 py-1 text-xs font-bold text-[#52647d]">
                {t[eventData.deliveryMode]}
              </span>
              <span className="rounded-lg bg-[#f1f5f9] px-3 py-1 text-xs font-bold text-[#52647d]">
                {eventData.checkInMode === "ONE_WAY" ? t.oneWay : t.twoWay}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#102a50] md:text-3xl">
              {eventData.name}
            </h1>

            <p className="flex items-center gap-2 text-sm text-[#52647d]">
              <MapPin size={18} className="shrink-0 text-[#154a9b]" />
              <span>{eventData.location || t.locationPending}</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-3 rounded-2xl bg-[#f8fafc] p-4 sm:flex-row lg:flex-col">
            <div className="rounded-xl bg-white px-5 py-3 text-center shadow-sm">
              <strong className="block text-3xl font-extrabold text-[#154a9b]">
                {eventData.points}
              </strong>
              <span className="text-xs font-semibold text-[#64748b]">{t.points}</span>
            </div>

            <div className="flex flex-col gap-2">
              {isRegistered ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#ecfdf5] px-4 py-2.5 text-xs font-bold text-[#047857]">
                    <CheckCircle2 size={16} />
                    {t.registered}
                  </div>
                  <button
                    type="button"
                    disabled={now > regEndTime || cancelMutation.isPending}
                    onClick={() => setCancelling(true)}
                    className="rounded-xl bg-[#fff0f1] px-4 py-2.5 text-sm font-bold text-[#bd3343] transition hover:bg-[#ffe5e8] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.cancelRegistration}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!isRegOpen || isFull || registerMutation.isPending}
                  onClick={() => registerMutation.mutate()}
                  className="rounded-xl bg-[#154a9b] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-16px_rgba(21,74,155,.8)] transition hover:bg-[#103f85] active:scale-[.98] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-40"
                >
                  {registerMutation.isPending
                    ? "..."
                    : isFull
                      ? t.full
                      : isPendingReg
                        ? t.registrationPending
                        : !isRegOpen
                          ? t.registrationClosed
                          : t.register}
                </button>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#e1e8f0] bg-white p-4">
            <CalendarClock size={18} className="text-[#154a9b]" />
            <dt className="mt-3 text-xs font-semibold text-[#718096]">{t.starts}</dt>
            <dd className="mt-1 font-bold text-[#263b58]">
              {formatDate(eventData.timeStart, locale)}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#e1e8f0] bg-white p-4">
            <CalendarDays size={18} className="text-[#154a9b]" />
            <dt className="mt-3 text-xs font-semibold text-[#718096]">{t.ends}</dt>
            <dd className="mt-1 font-bold text-[#263b58]">
              {formatDate(eventData.timeEnd, locale)}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#e1e8f0] bg-white p-4">
            <Users size={18} className="text-[#154a9b]" />
            <dt className="mt-3 text-xs font-semibold text-[#718096]">{t.capacity}</dt>
            <dd className="mt-1 font-bold text-[#263b58]">
              {eventData.capacity === null
                ? t.unlimited
                : `${eventData.registeredCount}/${eventData.capacity} (${eventData.remainingSlots} ${t.remaining})`}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#e1e8f0] bg-white p-4">
            <Building2 size={18} className="text-[#154a9b]" />
            <dt className="mt-3 text-xs font-semibold text-[#718096]">{t.organizer}</dt>
            <dd className="mt-1 font-bold text-[#263b58]">
              {eventData.organizer ? organizerLabel(eventData.organizer) : "TDTU"}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#e1e8f0] bg-white p-4">
            <ShieldCheck size={18} className="text-[#154a9b]" />
            <dt className="mt-3 text-xs font-semibold text-[#718096]">{t.criterion}</dt>
            <dd className="mt-1 font-bold text-[#263b58]">{eventData.criteria.title}</dd>
          </div>
          <div className="rounded-2xl border border-[#e1e8f0] bg-white p-4">
            <CalendarDays size={18} className="text-[#154a9b]" />
            <dt className="mt-3 text-xs font-semibold text-[#718096]">{t.semester}</dt>
            <dd className="mt-1 font-bold text-[#263b58]">
              {eventData.semester.type} · {eventData.semester.year}
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-2xl border border-[#e1e8f0] bg-[#fbfcfd] p-4">
          <p className="text-xs font-semibold text-[#718096]">{t.registrationTime}</p>
          <p className="mt-2 text-sm font-semibold text-[#263b58]">
            {formatDate(eventData.registrationStart, locale)} –{" "}
            {formatDate(eventData.registrationEnd, locale)}
          </p>
        </div>

        {(() => {
          const { cleanedHtml, images: extractedImages } = extractImagesFromHtml(
            eventData.description ?? "",
          );
          const allImages = Array.from(new Set([...(eventData.images ?? []), ...extractedImages]));
          if (!cleanedHtml.trim() && allImages.length === 0) return null;
          return (
            <div className="mt-8 border-t border-[#e8edf3] pt-6 space-y-6">
              <h2 className="text-lg font-bold text-[#102a50]">
                {locale === "vi" ? "Thông tin chi tiết sự kiện" : "Event details"}
              </h2>

              {allImages.length > 0 ? (
                <div className="mb-4">
                  <FacebookImageGallery images={allImages} />
                </div>
              ) : null}

              {cleanedHtml.trim() ? (
                <div
                  className="event-rich-content rounded-2xl border border-[#e1e8f0] bg-white p-6"
                  dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                />
              ) : null}
            </div>
          );
        })()}
      </div>

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={() => cancelMutation.mutate()}
        title={t.cancelRegistration}
        subject={eventData.name}
        description={t.confirmCancel}
        pending={cancelMutation.isPending}
      />
    </div>
  );
}
