"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { saveAuthSession } from "@/lib/auth-storage";
import { loginWithGoogle } from "@/services/auth";

export function useGoogleLogin() {
  const router = useRouter();
  const { message } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential || isSubmitting) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const session = await loginWithGoogle(response.credential);
        saveAuthSession(session);
        router.replace(session.user.role === "STUDENT" ? "/dashboard" : "/admin/dashboard");
      } catch (requestError) {
        const apiMessage = requestError instanceof Error ? requestError.message : "";
        setError(
          apiMessage === "Only TDTU email accounts are allowed"
            ? message.login.tdtuEmailOnly
            : message.login.googleLoginError,
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, message.login.googleLoginError, message.login.tdtuEmailOnly, router],
  );

  return { error, handleCredential, isSubmitting };
}
