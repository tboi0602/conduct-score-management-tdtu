"use client";

import Link from "next/link";
import { CheckCircle2, LocateFixed, MapPin, XCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { useStudentCheckIn } from "@/hooks/attendance/useStudentCheckIn";

export function StudentCheckIn({ token }: { token: string }) {
  const { locale } = useLanguage();
  const t = attendanceMessages[locale];
  const { mutation, request: requestQuery, status } = useStudentCheckIn(token);
  return (
    <section className="mx-auto max-w-xl">
      <Link
        href="/events"
        className="inline-flex items-center rounded-lg px-2 py-1 text-sm font-semibold text-[#154a9b] transition hover:bg-[#eaf2fc]"
      >
        ← {t.back}
      </Link>
      <div className="relative mt-5 overflow-hidden rounded-[28px] border border-[#d9e3ee] bg-white p-7 text-center shadow-[0_28px_65px_-44px_rgba(16,42,80,.7)] sm:p-9">
        <span className="absolute inset-x-0 top-0 h-1 bg-[#154a9b]" />
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b]">
          {status === "ACCEPTED" ? (
            <CheckCircle2 size={30} />
          ) : status === "REJECTED" ? (
            <XCircle size={30} />
          ) : (
            <LocateFixed size={30} />
          )}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-[#102a50]">{t.studentTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-[#66758a]">{t.studentDescription}</p>
        {!token ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {t.invalidQr}
          </p>
        ) : null}
        {status ? (
          <div
            className={`mt-6 rounded-xl p-4 text-sm font-bold ${status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
          >
            {status === "ACCEPTED"
              ? t.accepted
              : status === "REJECTED"
                ? `${t.rejected}${requestQuery.data?.rejectionReason ? `: ${requestQuery.data.rejectionReason}` : ""}`
                : t.pending}
          </div>
        ) : (
          <button
            type="button"
            disabled={!token || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white shadow-[0_12px_28px_-16px_rgba(21,74,155,.8)] transition hover:-translate-y-0.5 hover:bg-[#103f85] active:translate-y-0 active:scale-[.99] disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:opacity-50"
          >
            <MapPin size={18} />
            {mutation.isPending ? t.locating : t.sendCheckIn}
          </button>
        )}
      </div>
    </section>
  );
}
