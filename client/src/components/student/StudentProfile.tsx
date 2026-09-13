"use client";

import { Mail, Save, UserRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { useStudentProfile } from "@/hooks/users/useStudentProfile";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#cbd8e7] bg-[#fbfcfe] px-3.5 text-sm text-[#263b58] outline-none transition hover:border-[#afc1d7] focus:border-[#154a9b] focus:bg-white focus:ring-4 focus:ring-[#154a9b]/10 disabled:bg-[#f4f7fa]";

export function StudentProfile() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const state = useStudentProfile();
  if (state.profile.isPending) return <PageLoadingSkeleton />;
  const data = state.profile.data?.data;
  const student = data?.student;
  if (!data || !student)
    return (
      <p role="alert" className="rounded-xl bg-[#fff1f2] p-4 text-sm text-[#b72e3f]">
        {t.profileError}
      </p>
    );
  return (
    <section className="mx-auto max-w-5xl">
      <header className="border-b border-[#dfe7f0] pb-6">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-7 bg-[#154a9b]" />
          <p className="text-nowrap text-xs font-bold uppercase tracking-[.14em] text-[#154a9b]">
            TDTU
          </p>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
          {t.editProfile}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60728a]">{t.profileDescription}</p>
      </header>
      <form onSubmit={state.submit} className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[24px] border border-[#d9e3ee] bg-white p-6 shadow-[0_22px_50px_-40px_rgba(16,42,80,.65)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf2fc] text-[#154a9b]">
              <UserRound size={21} />
            </span>
            <h2 className="font-bold text-[#102a50]">{t.profile}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-[#263b58]">
              {t.fullName}
              <input
                required
                maxLength={100}
                name="name"
                defaultValue={data.name}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-semibold text-[#263b58]">
              {t.phone}
              <input
                name="phone"
                maxLength={20}
                defaultValue={student.phone ?? ""}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-semibold text-[#263b58]">
              {t.dateOfBirth}
              <input
                name="dateOfBirth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={student.dateOfBirth?.slice(0, 10) ?? ""}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-semibold text-[#263b58] sm:col-span-2">
              {t.address}
              <input
                name="address"
                maxLength={255}
                defaultValue={student.address ?? ""}
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={state.mutation.isPending || !state.classId}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-16px_rgba(21,74,155,.8)] transition hover:-translate-y-0.5 hover:bg-[#103f85] active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:opacity-50"
          >
            <Save size={17} />
            {state.mutation.isPending ? t.saving : t.save}
          </button>
        </div>
        <div className="rounded-[24px] border border-[#d9e3ee] bg-white p-6 shadow-[0_22px_50px_-42px_rgba(16,42,80,.5)]">
          <p className="mb-5 text-sm leading-6 text-[#66758a]">{t.academicReadonly}</p>
          <div className="space-y-4">
            <Info icon={<Mail size={17} />} label={t.email} value={data.email} />
            <label className="block text-sm font-semibold text-[#263b58]">
              {t.studentCode}
              <input
                required
                name="studentCode"
                maxLength={20}
                defaultValue={student.studentCode}
                className={inputClass}
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.faculty}</p>
              <CustomSelect
                ariaLabel={t.faculty}
                value={state.facultyId}
                placeholder={t.allFaculties}
                onChange={state.selectFaculty}
                options={state.faculties.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.major}</p>
              <CustomSelect
                ariaLabel={t.major}
                value={state.majorId}
                placeholder={t.allMajors}
                disabled={!state.facultyId}
                onChange={state.selectMajor}
                options={state.majors.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.class}</p>
              <CustomSelect
                ariaLabel={t.class}
                value={state.classId}
                placeholder={t.allClasses}
                disabled={!state.majorId}
                onChange={state.selectClass}
                options={state.classes.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            {!state.classId ? (
              <p role="alert" className="text-xs font-semibold text-[#b72e3f]">
                {t.class} *
              </p>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#e4eaf2] bg-[#f8fafc] p-3.5">
      <span className="mt-0.5 text-[#154a9b]">{icon}</span>
      <div>
        <dt className="text-xs font-semibold text-[#718096]">{label}</dt>
        <dd className="mt-1 text-sm font-bold text-[#263b58]">{value}</dd>
      </div>
    </div>
  );
}
