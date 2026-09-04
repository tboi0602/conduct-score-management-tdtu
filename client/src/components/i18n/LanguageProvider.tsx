"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { messages, type Locale } from "@/i18n/messages";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  message: (typeof messages)[Locale];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("vi");
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("locale");
    if (savedLocale === "vi" || savedLocale === "en") {
      setLocale(savedLocale);
    }
    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    window.localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }, [locale, storageLoaded]);

  const value = useMemo(() => ({ locale, setLocale, message: messages[locale] }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
