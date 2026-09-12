"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { adminMessages } from "@/i18n/admin-messages";

export function useAdminTranslations() {
  const { locale } = useLanguage();
  return { locale, t: adminMessages[locale] };
}
