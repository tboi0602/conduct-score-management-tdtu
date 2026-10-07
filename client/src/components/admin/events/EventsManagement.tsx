"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CalendarDays,
  Eye,
  MapPin,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  Users,
  ScanLine,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManagementError, ManagementNotice } from "@/components/admin/ManagementFeedback";
import { primaryButton } from "@/components/admin/management-styles";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { EventForm } from "@/components/admin/events/EventForm";
import { EventFilters } from "@/components/admin/events/EventFilters";
import { EventDetails } from "@/components/admin/events/EventDetails";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { EventCardGallery } from "@/components/ui/EventCardGallery";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useEventManagement } from "@/hooks/events/useEventManagement";
import {
  formatDate,
  managementError,
  organizerFacultyName,
  organizerLabel,
  semesterLabel,
} from "@/lib/event-form";
import type { ManagedEvent } from "@/types/events";

export function EventsManagement() {
  const state = useEventManagement();
  const { can } = useAdminAccess();
  const { t, locale } = useAdminTranslations();
  const [viewing, setViewing] = useState<ManagedEvent | null>(null);
  const router = useRouter();
  const loadDetail = (event: ManagedEvent, action: (detail: ManagedEvent) => void) => {
    void state.loadDetail(event.id).then(action);
  };
  return (
    <section>
      <AdminPageHeader
        eyebrow={t.activitiesEyebrow}
        title={t.eventTitle}
        description={t.eventDescription}
        action={
          <div className="flex items-center gap-3">
            <IconButton
              label={t.refreshData}
              onClick={() => void state.reload()}
              disabled={state.isFetching}
            >
              <RotateCw size={17} />
            </IconButton>
            {can("event.create") ? (
              <button type="button" onClick={state.openCreate} className={primaryButton}>
                <Plus size={17} />
                {t.addEvent}
              </button>
            ) : null}
          </div>
        }
      />
      <ManagementNotice notice={state.notice} />
      <EventFilters
        searchTerm={state.searchTerm}
        onSearch={state.setSearchTerm}
        onApply={state.applyFilters}
        onClear={state.clearFilters}
      />
      {state.requestError ? (
        <div className="mt-5 rounded-2xl border border-[#dce4ef] bg-white p-5">
          <ManagementError
            error={state.requestError}
            fallback={t.loadError}
            retry={() => void state.reload()}
          />
        </div>
      ) : null}
      <div aria-busy={state.isFetching} className="mt-5 grid gap-5 xl:grid-cols-2">
        {state.isLoading || state.isFetching
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-[22px] border border-[#dce4ef] bg-white"
              />
            ))
          : state.items.map((event) => (
              <article
                key={event.id}
                className="group relative flex min-h-72 flex-col overflow-hidden rounded-[24px] border border-[#d9e3ee] bg-white p-5 shadow-[0_20px_48px_-38px_rgba(16,42,80,.62)] transition duration-200 hover:-translate-y-1 hover:border-[#b9cae0] hover:shadow-[0_26px_55px_-36px_rgba(16,42,80,.6)]"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[#154a9b] opacity-85" />
                <header className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eaf2fc] font-bold text-[#154a9b]">
                      {(event.organizer ? organizerLabel(event.organizer) : "TDTU")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#263b58]">
                        {event.organizer ? organizerLabel(event.organizer) : "TDTU"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#718096]">
                        {semesterLabel(event.semester, t)} · {t[event.type]}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {(() => {
                      const now = Date.now();
                      const start = new Date(event.timeStart).getTime();
                      const end = new Date(event.timeEnd).getTime();
                      if (now < start) {
                        return (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            {t.UPCOMING}
                          </span>
                        );
                      }
                      if (now <= end) {
                        return (
                          <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#154a9b]">
                            {t.ONGOING}
                          </span>
                        );
                      }
                      return (
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          {t.COMPLETED}
                        </span>
                      );
                    })()}
                    <span className="rounded-lg bg-[#edf4fc] px-2.5 py-1 text-xs font-bold text-[#154a9b]">
                      {t[event.checkInMode]}
                    </span>
                  </div>
                </header>
                <EventCardGallery
                  images={event.images}
                  onImageClick={() => loadDetail(event, setViewing)}
                />
                <button
                  type="button"
                  onClick={() => loadDetail(event, setViewing)}
                  className="mt-3.5 text-left"
                >
                  <h2 className="line-clamp-2 text-xl font-bold leading-7 tracking-[-.02em] text-[#102a50] transition group-hover:text-[#154a9b]">
                    {event.name}
                  </h2>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="font-semibold text-[#154a9b]">
                      {event.organizer ? organizerLabel(event.organizer) : "TDTU"}
                    </p>
                    {organizerFacultyName(event.organizer) ? (
                      <p className="text-[#66758a]">
                        <span className="font-medium text-[#4a5568]">Khoa:</span>{" "}
                        {organizerFacultyName(event.organizer)}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#66758a]">
                    {event.descriptionPreview || event.criteria.title}
                  </p>
                </button>
                <p className="mt-4 flex items-start gap-2 text-sm text-[#52647d]">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#154a9b]" />
                  <span className="line-clamp-2">{event.location || t.locationPending}</span>
                </p>
                <div className="mt-5 grid gap-3 border-y border-[#e8edf3] py-4 text-sm text-[#52647d] sm:grid-cols-3">
                  <p className="flex items-center gap-2">
                    <CalendarDays size={16} className="shrink-0 text-[#154a9b]" />
                    <span>{formatDate(event.timeStart, locale)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Award size={16} className="shrink-0 text-[#154a9b]" />
                    <span>
                      {event.points} {t.points}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users size={16} className="shrink-0 text-[#154a9b]" />
                    <span>
                      {event.registeredCount}
                      {event.capacity === null ? "" : `/${event.capacity}`}
                    </span>
                  </p>
                </div>
                <footer className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
                  <IconButton label={t.view} onClick={() => loadDetail(event, setViewing)}>
                    <Eye size={16} />
                  </IconButton>
                  {can("event-registration.manage") ? (
                    <IconButton
                      label={t.registrations}
                      tone="brand"
                      onClick={() => router.push(`/admin/events/${event.id}/registrations`)}
                    >
                      <Users size={16} />
                    </IconButton>
                  ) : null}
                  {can("attendance.read") ? (
                    <IconButton
                      label={t.attendance}
                      tone="brand"
                      onClick={() => router.push(`/admin/attendance/${event.id}`)}
                    >
                      <ScanLine size={16} />
                    </IconButton>
                  ) : null}
                  {can("event.update") ? (
                    <IconButton
                      label={t.edit}
                      tone="brand"
                      onClick={() => loadDetail(event, state.openEdit)}
                    >
                      <Pencil size={16} />
                    </IconButton>
                  ) : null}
                  {can("event.delete") ? (
                    <IconButton
                      label={t.delete}
                      tone="danger"
                      onClick={() => state.openDelete(event)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  ) : null}
                </footer>
              </article>
            ))}
      </div>
      {!state.isLoading && !state.isFetching && !state.requestError && state.items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#cad5e5] bg-white p-10 text-center text-sm text-[#66758a]">
          {t.noData} {t.tryFilter}
        </p>
      ) : null}
      {state.pagination.totalPages > 1 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce4ef] bg-white">
          <PaginationControls
            pagination={state.pagination}
            onPageChange={state.setPage}
            disabled={state.isFetching || Boolean(state.requestError)}
            maxOffset={10000}
          />
        </div>
      ) : null}
      <Modal
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={state.editing ? t.editEvent : t.addEvent}
      >
        <EventForm
          key={state.editing?.id ?? "new"}
          event={state.editing}
          saving={state.isSaving}
          error={state.actionError}
          onSubmit={state.submit}
          onCancel={state.closeModal}
        />
      </Modal>
      <EventDetails event={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={state.closeDelete}
        onConfirm={state.confirmDelete}
        title={t.confirmDeleteEvent}
        subject={state.deleting?.name ?? ""}
        description={t.eventDeleteWarning}
        pending={state.isDeleting}
        error={state.actionError ? managementError(state.actionError, t, t.deleteError) : null}
      />
    </section>
  );
}
