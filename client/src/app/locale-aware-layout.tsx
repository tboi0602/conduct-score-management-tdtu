"use client";

import { Providers } from "@/providers";

export default function LocaleAwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}