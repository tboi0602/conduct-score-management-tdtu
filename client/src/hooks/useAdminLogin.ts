"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { saveAuthSession } from "@/lib/auth-storage";
import { loginAdmin } from "@/services/auth";
import { useToast } from "@/components/ui/ToastProvider";

export function useAdminLogin() {
  const router = useRouter();
  const { message, locale } = useLanguage();
  const { showToast } = useToast();
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
      showToast(locale === "vi" ? "Đăng nhập thành công." : "Signed in successfully.");
      router.replace("/admin/dashboard");
    } catch (requestError) {
      const apiMessage = requestError instanceof Error ? requestError.message : "";
      setError(
        apiMessage === "Invalid email or password"
          ? message.admin.invalidCredentials
          : message.admin.loginError,
      );
      showToast(
        locale === "vi"
          ? "Đăng nhập thất bại. Vui lòng kiểm tra thông tin."
          : "Sign-in failed. Please check your credentials.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, handleSubmit, isSubmitting };
}
