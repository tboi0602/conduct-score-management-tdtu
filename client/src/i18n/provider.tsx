"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";

type Locale = "vi" | "en";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const messages: Record<Locale, Record<string, string>> = {
  vi: {
    "scan.title": "Quét mã điểm danh",
    "scan.placeholder": "Nhập mã sinh viên hoặc quét barcode",
    "scan.button": "Điểm danh",
    "score.title": "Điểm rèn luyện",
    "welcome": "Chào mừng đến với hệ thống",
    "nav.home": "Trang chủ",
    "nav.scan": "Điểm danh",
    "nav.report": "Báo cáo",
  },
  en: {
    "scan.title": "Scan Attendance Code",
    "scan.placeholder": "Enter student code or scan barcode",
    "scan.button": "Check In",
    "score.title": "Conduct Score",
    "welcome": "Welcome to the system",
    "nav.home": "Home",
    "nav.scan": "Scan",
    "nav.report": "Report",
  },
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `locale=${l};path=/;max-age=31536000`;
  }, []);

  const t = useCallback(
    (key: string): string => messages[locale][key] ?? key,
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleCtx(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocaleCtx must be inside LocaleProvider");
  return ctx;
}