"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { saveAuthSession } from "@/lib/auth-storage";
import { loginWithGoogle, type LoginMode } from "@/services/auth";
import { useToast } from "@/components/ui/ToastProvider";

export function useGoogleLogin(mode: LoginMode) {
  const router = useRouter();
  const { message, locale } = useLanguage();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential || isSubmitting) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const session = await loginWithGoogle(response.credential, mode);
        saveAuthSession(session);
        showToast(locale === "vi" ? "Đăng nhập thành công." : "Signed in successfully.");
        router.replace(mode === "STUDENT" ? "/dashboard" : "/admin/dashboard");
      } catch (requestError) {
        const apiMessage = requestError instanceof Error ? requestError.message : "";
        setError(
          apiMessage === "Only TDTU email accounts are allowed"
            ? message.login.tdtuEmailOnly
            : message.login.googleLoginError,
        );
        showToast(
          locale === "vi" ? "Đăng nhập Google thất bại." : "Google sign-in failed.",
          "error",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      locale,
      message.login.googleLoginError,
      message.login.tdtuEmailOnly,
      mode,
      router,
      showToast,
    ],
  );

  return { error, handleCredential, isSubmitting };
}
