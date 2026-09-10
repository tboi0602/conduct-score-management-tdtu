import type { Metadata } from "next";

import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { RouteTitle } from "@/components/layout/RouteTitle";

import "./globals.css";

export const metadata: Metadata = {
  title: "Quản lý điểm rèn luyện TDTU",
  description: "Hệ thống quản lý điểm rèn luyện TDTU",
  icons: {
    icon: [
      {
        url: "/images/logo.png",
        type: "image/png",
        sizes: "612x338",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <LanguageProvider>
            <RouteTitle />
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
