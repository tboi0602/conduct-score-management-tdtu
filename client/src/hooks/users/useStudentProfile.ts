"use client";

import { type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { getAuthSession, saveAuthSession } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";

export function useStudentProfile() {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const client = useQueryClient();

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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    mutation.mutate({
      name: String(form.get("name") ?? "").trim(),
      phone: value("phone"),
      address: value("address"),
      dateOfBirth: value("dateOfBirth"),
    });
  };

  return {
    mutation,
    submit,
  };
}
