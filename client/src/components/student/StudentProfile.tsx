"use client";

import Barcode from "react-barcode";
import {
  BookOpen,
  Building2,
  GraduationCap,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useStudentProfile } from "@/hooks/users/useStudentProfile";
import { studentEventMessages } from "@/i18n/student-event-messages";

const inputClass =
  "h-11 w-full rounded-xl border border-[#cdd9e7] px-3 text-sm text-[#263b58] outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10";

export function StudentProfile() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const { profile, isLoading, error } = useAdminAccess();
  const form = useStudentProfile();
  if (isLoading) return <PageLoadingSkeleton />;
  const student = profile?.student;
  if (error || !student || !profile) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
        {t.profileError}
      </p>
    );
  }
  const academic = [
    {
      label: t.faculty,
      value: student.class?.major.faculty.name,
      code: student.class?.major.faculty.code,
      icon: Building2,
    },
    {
      label: t.major,
      value: student.class?.major.name,
      code: student.class?.major.code,
      icon: BookOpen,
    },
    { label: t.class, value: student.class?.name, code: student.class?.code, icon: GraduationCap },
  ];
  return (
    <section className="mx-auto max-w-6xl">
      <header className="border-b border-[#dfe7f0] pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
          <UserRound size={17} /> {t.studentPortal}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
          {t.profile}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#60728a]">{t.profileDescription}</p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
        <article className="overflow-hidden rounded-[26px] bg-[#154a9b] text-white shadow-[0_28px_65px_-40px_rgba(21,74,155,.75)]">
          <div className="flex items-center justify-between border-b border-white/15 px-6 py-5">
            <span className="text-xs font-bold uppercase tracking-[.16em] text-white/70">
              {t.studentCard}
            </span>
            <IdCard size={23} />
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-black text-[#154a9b]">
                {profile.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
                <p className="mt-1 flex items-center gap-2 truncate text-sm text-white/75">
                  <Mail size={15} /> {profile.email}
                </p>
                <p className="mt-3 font-mono text-lg font-bold tracking-[.12em]">
                  {student.studentCode}
                </p>
              </div>
            </div>
            <div className="mt-7 overflow-hidden rounded-2xl bg-white p-4 text-center text-[#102a50] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
              <Barcode
                value={student.studentCode}
                format="CODE128"
                width={3}
                height={72}
                displayValue
                font="monospace"
                fontSize={15}
                margin={0}
                background="#ffffff"
                lineColor="#102a50"
              />
            </div>
          </div>
        </article>

        <article className="rounded-[26px] border border-[#d9e3ee] bg-white p-6 shadow-[0_20px_48px_-40px_rgba(16,42,80,.6)]">
          <h2 className="text-lg font-bold text-[#102a50]">{t.dashboardAcademicInfo}</h2>
          <p className="mt-1 text-sm text-[#66758a]">{t.academicReadonly}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {academic.map(({ label, value, code, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-[#f3f7fb] p-4">
                <Icon size={19} className="text-[#154a9b]" />
                <dt className="mt-3 text-xs font-semibold text-[#718096]">{label}</dt>
                <dd className="mt-1 text-sm font-bold text-[#263b58]">
                  {value || t.dashboardNotUpdated}
                </dd>
                {code ? <p className="mt-1 text-xs text-[#718096]">{code}</p> : null}
              </div>
            ))}
          </dl>
        </article>
      </div>

      <form
        onSubmit={form.submit}
        className="mt-6 rounded-[26px] border border-[#d9e3ee] bg-white p-6 shadow-[0_20px_48px_-42px_rgba(16,42,80,.55)]"
      >
        <div className="flex items-center gap-3 border-b border-[#e5ebf2] pb-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fc] text-[#154a9b]">
            <UserRound size={19} />
          </span>
          <div>
            <h2 className="font-bold text-[#102a50]">{t.editProfile}</h2>
            <p className="text-sm text-[#66758a]">{t.profileDescription}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label={t.fullName}>
            <input
              required
              maxLength={100}
              name="name"
              defaultValue={profile.name}
              className={inputClass}
            />
          </Field>
          <Field label={t.phone}>
            <div className="relative">
              <Phone size={17} className="absolute left-3 top-3 text-[#718096]" />
              <input
                name="phone"
                defaultValue={student.phone ?? ""}
                maxLength={20}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>
          <Field label={t.dateOfBirth}>
            <input
              type="date"
              name="dateOfBirth"
              defaultValue={student.dateOfBirth?.slice(0, 10) ?? ""}
              max={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </Field>
          <Field label={t.address}>
            <div className="relative">
              <MapPin size={17} className="absolute left-3 top-3 text-[#718096]" />
              <input
                name="address"
                defaultValue={student.address ?? ""}
                maxLength={255}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>
        </div>
        <button
          type="submit"
          disabled={form.mutation.isPending}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white transition hover:bg-[#103f85] active:scale-[.98] disabled:opacity-50"
        >
          <Save size={17} /> {form.mutation.isPending ? t.saving : t.save}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[#40546f]">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
