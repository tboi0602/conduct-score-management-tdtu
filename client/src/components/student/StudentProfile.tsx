"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Save, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { getAuthSession, saveAuthSession } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import { eventRegistrationService } from "@/services/events";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3.5 text-sm text-[#263b58] outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10 disabled:bg-[#f4f7fa]";

export function StudentProfile() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const { showToast } = useToast();
  const client = useQueryClient();
  const [facultyId, setFacultyId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [classId, setClassId] = useState("");
  const profile = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: adminService.getCurrentUser,
    staleTime: 5 * 60_000,
  });
  const academics = useQuery({
    queryKey: queryKeys.studentEvents.academicOptions,
    queryFn: () => eventRegistrationService.academicOptions(),
    staleTime: 10 * 60_000,
  });
  const currentClass = profile.data?.data.student?.class;
  useEffect(() => {
    setFacultyId(currentClass?.major.faculty.id ?? "");
    setMajorId(currentClass?.major.id ?? "");
    setClassId(currentClass?.id ?? "");
  }, [currentClass?.id, currentClass?.major.id, currentClass?.major.faculty.id]);
  const mutation = useMutation({
    mutationFn: adminService.updateCurrentStudent,
    onSuccess: (response) => {
      client.setQueryData(queryKeys.auth.me, response);
      const session = getAuthSession();
      if (session)
        saveAuthSession({ ...session, user: { ...session.user, name: response.data.name } });
      showToast(t.profileSaved);
    },
    onError: () => showToast(t.profileError, "error"),
  });
  if (profile.isPending) return <PageLoadingSkeleton />;
  const data = profile.data?.data;
  const student = data?.student;
  if (!data || !student)
    return (
      <p role="alert" className="rounded-xl bg-[#fff1f2] p-4 text-sm text-[#b72e3f]">
        {t.profileError}
      </p>
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    mutation.mutate({
      name: String(form.get("name") ?? "").trim(),
      phone: value("phone"),
      address: value("address"),
      dateOfBirth: value("dateOfBirth"),
      studentCode: String(form.get("studentCode") ?? "").trim(),
      classId,
    });
  };
  const faculties = academics.data?.data ?? [];
  const majors = faculties.find((item) => item.id === facultyId)?.majors ?? [];
  const classes = majors.find((item) => item.id === majorId)?.classes ?? [];
  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-bold tracking-[.14em] text-[#154a9b]">TDTU</p>
      <h1 className="mt-2 text-3xl font-bold text-[#102a50]">{t.editProfile}</h1>
      <p className="mt-2 text-sm text-[#66758a]">{t.profileDescription}</p>
      <form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[22px] border border-[#dce4ef] bg-white p-6 shadow-[0_18px_42px_-32px_rgba(31,67,111,.5)]">
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
            disabled={mutation.isPending || !classId}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Save size={17} />
            {mutation.isPending ? t.saving : t.save}
          </button>
        </div>
        <div className="rounded-[22px] border border-[#dce4ef] bg-white p-6">
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
                value={facultyId}
                placeholder={t.allFaculties}
                onChange={(value) => {
                  setFacultyId(value);
                  setMajorId("");
                  setClassId("");
                }}
                options={faculties.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.major}</p>
              <CustomSelect
                ariaLabel={t.major}
                value={majorId}
                placeholder={t.allMajors}
                disabled={!facultyId}
                onChange={(value) => {
                  setMajorId(value);
                  setClassId("");
                }}
                options={majors.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.class}</p>
              <CustomSelect
                ariaLabel={t.class}
                value={classId}
                placeholder={t.allClasses}
                disabled={!majorId}
                onChange={setClassId}
                options={classes.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            {!classId ? (
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
    <div className="flex gap-3 rounded-xl bg-[#f7f9fc] p-3">
      <span className="mt-0.5 text-[#154a9b]">{icon}</span>
      <div>
        <dt className="text-xs font-semibold text-[#718096]">{label}</dt>
        <dd className="mt-1 text-sm font-bold text-[#263b58]">{value}</dd>
      </div>
    </div>
  );
}
