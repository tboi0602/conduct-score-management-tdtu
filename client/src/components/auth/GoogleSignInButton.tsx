"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGoogleLogin } from "@/hooks/auth/useGoogleLogin";
import { env } from "@/lib/env";
import type { LoginMode } from "@/services/auth";

export function GoogleSignInButton({ mode }: { mode: LoginMode }) {
  const { locale, message } = useLanguage();
  const { error, handleCredential, isSubmitting } = useGoogleLogin(mode);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const renderGoogleButton = useCallback(() => {
    const container = buttonContainerRef.current;
    if (!container || !window.google || !env.googleClientId) return;

    container.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: env.googleClientId,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: Math.floor(container.getBoundingClientRect().width),
      locale,
    });
  }, [handleCredential, locale]);

  useEffect(() => {
    if (!scriptReady) return;
    renderGoogleButton();
  }, [renderGoogleButton, scriptReady]);

  if (!env.googleClientId) {
    return (
      <p role="alert" className="text-sm leading-5 text-red-600">
        {message.login.googleConfigError}
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div className="relative min-h-12 w-full overflow-hidden rounded-xl">
        <div ref={buttonContainerRef} className="min-h-12 w-full" />
        {isSubmitting ? (
          <div className="absolute inset-0 grid place-items-center bg-[#154a9b] text-white">
            <LoadingSpinner label={message.login.googleLoading} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
