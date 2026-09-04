"use client";

import { useLocale } from "@/hooks/useLocale";

export default function Header() {
  const { locale, setLocale } = useLocale();

  return (
    <header className="flex items-center justify-between px-6 py-4 shadow-sm">
      <h1 className="text-xl font-bold">SCSM</h1>
      <button
        onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
        className="rounded-lg border px-3 py-1 text-sm"
      >
        {locale === "vi" ? "EN" : "VI"}
      </button>
    </header>
  );
}