"use client";

import Link from "next/link";
import { Bell, BellRing, CheckCheck, ExternalLink } from "lucide-react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useStudentNotifications } from "@/hooks/notifications/useStudentNotifications";
import { studentNotificationMessages } from "@/i18n/student-notification-messages";

export function StudentNotificationsPage() {
  const { locale } = useLanguage();
  const t = studentNotificationMessages[locale];
  const state = useStudentNotifications();
  if (state.query.isPending) return <PageLoadingSkeleton />;
  const items = state.query.data?.data ?? [];
  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-4 border-b border-[#dfe7f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
            <BellRing size={17} /> {t.studentPortal}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-[#60728a]">{t.description}</p>
        </div>
        {(state.query.data?.unread ?? 0) > 0 ? (
          <button
            type="button"
            onClick={() => state.readAll.mutate()}
            disabled={state.readAll.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b9cbe0] bg-white px-4 text-sm font-bold text-[#154a9b] transition hover:bg-[#edf4fc] active:scale-[.98]"
          >
            <CheckCheck size={17} /> {t.markAll}
          </button>
        ) : null}
      </header>
      {state.query.error ? (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {t.loadError}
        </p>
      ) : null}
      {!state.query.error && !items.length ? (
        <div className="mt-7 rounded-[24px] border border-dashed border-[#c9d6e5] bg-white p-12 text-center">
          <Bell size={30} className="mx-auto text-[#9aabc0]" />
          <p className="mt-3 text-sm font-semibold text-[#66758a]">{t.empty}</p>
        </div>
      ) : null}
      <div className="mt-7 space-y-3">
        {items.map((item) => {
          const unread = !item.readAt;
          return (
            <article
              key={item.id}
              className={`rounded-[22px] border p-5 transition ${unread ? "border-[#b8cee8] bg-[#f3f8fe] shadow-[0_16px_35px_-30px_rgba(21,74,155,.65)]" : "border-[#dfe6ee] bg-white"}`}
            >
              <div className="flex gap-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${unread ? "bg-[#154a9b] text-white" : "bg-[#eef2f6] text-[#60728a]"}`}
                >
                  <Bell size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-bold text-[#102a50]">
                      {item.type === "CONDUCT_SCORE_WARNING"
                        ? t.conductScoreWarning
                        : item.type === "APPEAL_APPROVED"
                          ? t.approved
                          : t.rejected}
                    </h2>
                    <time className="text-xs tabular-nums text-[#718096]">
                      {new Date(item.createdAt).toLocaleString(locale)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#52647d]">
                    {item.type === "CONDUCT_SCORE_WARNING"
                      ? t.conductScoreWarningBody.replace("{threshold}", item.message || "80")
                      : null}
                    {item.type !== "CONDUCT_SCORE_WARNING" ? (
                      <>
                        {t.event}: <strong>{item.title}</strong>
                        {item.message ? ` · ${item.message}` : ""}
                      </>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {unread ? (
                      <button
                        type="button"
                        onClick={() => state.read.mutate(item.id)}
                        className="text-sm font-bold text-[#154a9b]"
                      >
                        {t.markRead}
                      </button>
                    ) : null}
                    {item.type === "CONDUCT_SCORE_WARNING" ? (
                      <Link
                        href="/conduct-scores"
                        className="inline-flex items-center gap-1 text-sm font-bold text-[#154a9b]"
                      >
                        <ExternalLink size={14} /> {t.viewConductScore}
                      </Link>
                    ) : item.entityId ? (
                      <Link
                        href="/appeals"
                        className="inline-flex items-center gap-1 text-sm font-bold text-[#154a9b]"
                      >
                        <ExternalLink size={14} /> {t.viewAppeal}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {(state.query.data?.pagination.totalPages ?? 0) > 1 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#dce4ef] bg-white">
          <PaginationControls
            pagination={state.query.data!.pagination}
            onPageChange={state.setPage}
            disabled={state.query.isFetching}
          />
        </div>
      ) : null}
    </section>
  );
}
