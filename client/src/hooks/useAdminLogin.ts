"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { saveAuthSession } from "@/lib/auth-storage";
import { loginAdmin } from "@/services/auth";

export function useAdminLogin() {
  const router = useRouter();
  const { message } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const session = await loginAdmin(email, password);
      saveAuthSession(session);
      router.replace("/admin/dashboard");
    } catch (requestError) {
      const apiMessage = requestError instanceof Error ? requestError.message : "";
      setError(
        apiMessage === "Invalid email or password"
          ? message.admin.invalidCredentials
          : message.admin.loginError,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, handleSubmit, isSubmitting };
}
