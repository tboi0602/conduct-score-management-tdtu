"use client";

import { IdCard, UserRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { studentEventMessages } from "@/i18n/student-event-messages";

export function StudentProfile() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const { profile, isLoading, error } = useAdminAccess();

  if (isLoading) return <PageLoadingSkeleton />;
  const student = profile?.student;
  if (error || !student) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {t.profileError}
      </p>
    );
  }

  const fields = [
    { label: t.profileClassId, value: student.classId },
    { label: t.studentCode, value: student.studentCode },
    { label: t.phone, value: student.phone },
    { label: t.address, value: student.address },
    {
      label: t.dateOfBirth,
      value: student.dateOfBirth
        ? new Date(student.dateOfBirth).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB")
        : null,
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <header className="border-b border-[#e6d9dc] pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#b42332]">
          <UserRound size={17} /> TDTU Student
        </div>
        <h1 className="mt-3 text-3xl font-bold text-[#34242a]">{t.profile}</h1>
        <p className="mt-2 text-sm text-[#765f66]">{t.profileReadOnlyDescription}</p>
      </header>
      <div className="mt-7 overflow-hidden rounded-2xl border border-[#eadde0] bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-[#154a9b] p-5 text-white">
          <IdCard size={22} />
          <h2 className="font-semibold">{t.profileStudentData}</h2>
        </div>
        <dl className="grid gap-px bg-[#f0e5e7] sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0 bg-white p-5">
              <dt className="text-xs font-semibold text-[#806a71]">{field.label}</dt>
              <dd className="mt-2 break-all text-sm font-semibold text-[#34242a]">
                {field.value || t.dashboardNotUpdated}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
