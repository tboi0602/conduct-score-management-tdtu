"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/i18n";

function VietnamFlag() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true" className="h-3.5 w-[21px] rounded-[3px]">
      <rect width="30" height="20" fill="#da251d" />
      <path
        d="m15 4 1.41 4.34h4.57l-3.7 2.69 1.42 4.34L15 12.68l-3.7 2.69 1.42-4.34-3.7-2.69h4.57z"
        fill="#ffdf00"
      />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true" className="h-3.5 w-[21px] rounded-[3px]">
      <rect width="30" height="20" fill="#21468b" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="5" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#cf142b" strokeWidth="2" />
      <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#cf142b" strokeWidth="3.5" />
    </svg>
  );
}

const options: Array<{ value: Locale; flag: ReactNode }> = [
  { value: "vi", flag: <VietnamFlag /> },
  { value: "en", flag: <UnitedKingdomFlag /> },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  if (compact) {
    const current = options.find((option) => option.value === locale) ?? options[0];
    const next = locale === "vi" ? "en" : "vi";
    return (
      <button
        type="button"
        onClick={() => setLocale(next)}
        aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        className="grid h-9 w-9 place-items-center rounded-xl border border-[#cad5e5] bg-white transition hover:border-[#9fb7d5] hover:bg-[#eef4fc] active:scale-[.96]"
      >
        <span className="overflow-hidden rounded-[3px] border border-black/10 shadow-sm">
          {current.flag}
        </span>
      </button>
    );
  }

  return (
    <div className="flex rounded-lg border border-[#cad5e5] bg-white p-1" aria-label="Language">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          aria-pressed={locale === option.value}
          className={`flex min-h-6 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-all active:scale-[.97] ${
            locale === option.value
              ? "bg-[#154a9b] text-white"
              : "text-[#66758a] hover:bg-[#eef4fc] hover:text-[#154a9b]"
          }`}
        >
          <span className="overflow-hidden rounded-[3px] border border-black/10 shadow-sm">
            {option.flag}
          </span>
        </button>
      ))}
    </div>
  );
}
