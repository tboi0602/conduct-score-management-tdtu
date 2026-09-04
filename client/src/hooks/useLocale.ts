"use client";

import { useLocaleCtx } from "@/i18n/provider";

export function useLocale() {
  return useLocaleCtx();
}