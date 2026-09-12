"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { getAuthSession, saveAuthSession } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import { eventRegistrationService } from "@/services/events";

export function useStudentProfile() {
  const { locale } = useLanguage();
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
    queryFn: eventRegistrationService.academicOptions,
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
      if (session) {
        saveAuthSession({ ...session, user: { ...session.user, name: response.data.name } });
      }
      showToast(studentEventMessages[locale].profileSaved);
    },
    onError: () => showToast(studentEventMessages[locale].profileError, "error"),
  });

  const faculties = academics.data?.data ?? [];
  const majors = useMemo(
    () => faculties.find((item) => item.id === facultyId)?.majors ?? [],
    [faculties, facultyId],
  );
  const classes = useMemo(
    () => majors.find((item) => item.id === majorId)?.classes ?? [],
    [majorId, majors],
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

  return {
    profile,
    mutation,
    submit,
    facultyId,
    majorId,
    classId,
    faculties,
    majors,
    classes,
    selectFaculty: (id: string) => {
      setFacultyId(id);
      setMajorId("");
      setClassId("");
    },
    selectMajor: (id: string) => {
      setMajorId(id);
      setClassId("");
    },
    selectClass: setClassId,
  };
}
